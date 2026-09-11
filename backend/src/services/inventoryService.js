/**
 * services/inventoryService.js
 * ----------------------------
 * Robust, atomic inventory reservation, release, fulfillment, and audit ledger service.
 * Prevents overselling via database-level conditional updates and concurrency locks.
 */

const crypto = require('crypto');
const { pool } = require('../config/db');

/**
 * Atomically reserves inventory for an order from a listing.
 * Throws INSUFFICIENT_INVENTORY if the requested quantity exceeds available quantity.
 */
async function reserveInventory({
  listingId,
  orderId,
  buyerId,
  sellerId,
  quantity,
  actorId = null,
  connection = null,
}) {
  const runner = connection || (await pool.getConnection());
  const isDedicatedConnection = !connection;

  try {
    if (isDedicatedConnection) await runner.beginTransaction();

    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      const err = new Error('Reservation quantity must be a positive number greater than 0.');
      err.code = 'INVALID_QUANTITY';
      throw err;
    }

    // 1. Check current listing details with row lock
    const [listingRows] = await runner.execute(
      'SELECT id, title, quantity, available_quantity, reserved_quantity, fulfilled_quantity, unit, status FROM waste_listings WHERE id = ? FOR UPDATE',
      [listingId]
    );

    if (listingRows.length === 0) {
      const err = new Error('Listing not found for inventory reservation.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const listing = listingRows[0];
    const prevAvailable = parseFloat(listing.available_quantity);
    const prevReserved = parseFloat(listing.reserved_quantity);
    const unit = listing.unit || 'kg';

    if (prevAvailable < numQty) {
      const err = new Error(`Only ${prevAvailable} ${unit} is available for this listing.`);
      err.code = 'INSUFFICIENT_INVENTORY';
      err.availableQuantity = prevAvailable;
      throw err;
    }

    // 2. Perform atomic conditional inventory update
    const [updateResult] = await runner.execute(
      `UPDATE waste_listings 
       SET available_quantity = available_quantity - ?,
           reserved_quantity = reserved_quantity + ?
       WHERE id = ? AND available_quantity >= ?`,
      [numQty, numQty, listingId, numQty]
    );

    if (updateResult.affectedRows === 0) {
      const err = new Error(`Only ${prevAvailable} ${unit} is available for this listing.`);
      err.code = 'INSUFFICIENT_INVENTORY';
      throw err;
    }

    const resultingAvailable = parseFloat((prevAvailable - numQty).toFixed(2));
    const resultingReserved = parseFloat((prevReserved + numQty).toFixed(2));

    // 3. Insert reservation record
    const reservationId = crypto.randomUUID();
    await runner.execute(
      `INSERT INTO inventory_reservations (
        id, order_id, listing_id, seller_id, buyer_id, reserved_quantity, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'RESERVED')`,
      [reservationId, orderId, listingId, sellerId, buyerId, numQty]
    );

    // 4. Log ledger transaction
    const txId = crypto.randomUUID();
    await runner.execute(
      `INSERT INTO inventory_transactions (
        id, listing_id, order_id, transaction_type, quantity,
        previous_available_quantity, resulting_available_quantity,
        actor_id, source, note
      ) VALUES (?, ?, ?, 'RESERVATION', ?, ?, ?, ?, 'ORDER_CREATION', ?)`,
      [
        txId,
        listingId,
        orderId,
        numQty,
        prevAvailable,
        resultingAvailable,
        actorId || buyerId,
        `Reserved ${numQty} ${unit} for Order #${orderId.slice(0, 8).toUpperCase()}`,
      ]
    );

    if (isDedicatedConnection) await runner.commit();

    return {
      success: true,
      reservationId,
      reservedQuantity: numQty,
      previousAvailable: prevAvailable,
      resultingAvailable,
      resultingReserved,
    };
  } catch (err) {
    if (isDedicatedConnection) await runner.rollback();
    throw err;
  } finally {
    if (isDedicatedConnection) runner.release();
  }
}

/**
 * Releases a reserved inventory allocation back to available quantity.
 * Idempotent: safe against duplicate release requests.
 */
async function releaseInventory({
  orderId,
  actorId = null,
  note = null,
  connection = null,
}) {
  const runner = connection || (await pool.getConnection());
  const isDedicatedConnection = !connection;

  try {
    if (isDedicatedConnection) await runner.beginTransaction();

    // 1. Lock and find active reservation
    const [resRows] = await runner.execute(
      'SELECT * FROM inventory_reservations WHERE order_id = ? FOR UPDATE',
      [orderId]
    );

    if (resRows.length === 0) {
      if (isDedicatedConnection) await runner.commit();
      return { released: false, reason: 'No reservation record found' };
    }

    const reservation = resRows[0];

    // Idempotency: only release if currently RESERVED
    if (reservation.status !== 'RESERVED') {
      if (isDedicatedConnection) await runner.commit();
      return {
        released: false,
        reason: `Reservation is already in "${reservation.status}" state`,
        status: reservation.status,
      };
    }

    const numQty = parseFloat(reservation.reserved_quantity);
    const listingId = reservation.listing_id;

    // 2. Transition reservation status to RELEASED
    await runner.execute(
      "UPDATE inventory_reservations SET status = 'RELEASED', updated_at = NOW() WHERE id = ? AND status = 'RESERVED'",
      [reservation.id]
    );

    // 3. Read previous listing available quantity
    const [listingRows] = await runner.execute(
      'SELECT available_quantity, reserved_quantity, unit FROM waste_listings WHERE id = ? FOR UPDATE',
      [listingId]
    );

    const prevAvailable = listingRows.length > 0 ? parseFloat(listingRows[0].available_quantity) : 0;
    const unit = listingRows.length > 0 ? listingRows[0].unit || 'kg' : 'kg';
    const resultingAvailable = parseFloat((prevAvailable + numQty).toFixed(2));

    // 4. Update listing inventory: return reserved quantity back to available
    await runner.execute(
      `UPDATE waste_listings
       SET available_quantity = available_quantity + ?,
           reserved_quantity = GREATEST(0.00, reserved_quantity - ?)
       WHERE id = ?`,
      [numQty, numQty, listingId]
    );

    // 5. Log ledger transaction
    const txId = crypto.randomUUID();
    await runner.execute(
      `INSERT INTO inventory_transactions (
        id, listing_id, order_id, transaction_type, quantity,
        previous_available_quantity, resulting_available_quantity,
        actor_id, source, note
      ) VALUES (?, ?, ?, 'RELEASE', ?, ?, ?, ?, 'ORDER_CANCELLATION', ?)`,
      [
        txId,
        listingId,
        orderId,
        numQty,
        prevAvailable,
        resultingAvailable,
        actorId,
        note || `Released ${numQty} ${unit} back to inventory for Order #${orderId.slice(0, 8).toUpperCase()}`,
      ]
    );

    if (isDedicatedConnection) await runner.commit();

    return {
      released: true,
      quantity: numQty,
      previousAvailable: prevAvailable,
      resultingAvailable,
    };
  } catch (err) {
    if (isDedicatedConnection) await runner.rollback();
    throw err;
  } finally {
    if (isDedicatedConnection) runner.release();
  }
}

/**
 * Fulfills reserved inventory when an order is delivered/completed.
 * Decreases reserved_quantity and increases fulfilled_quantity.
 * Idempotent: safe against duplicate fulfillment requests.
 */
async function fulfillInventory({
  orderId,
  actorId = null,
  note = null,
  connection = null,
}) {
  const runner = connection || (await pool.getConnection());
  const isDedicatedConnection = !connection;

  try {
    if (isDedicatedConnection) await runner.beginTransaction();

    // 1. Lock and find active reservation
    const [resRows] = await runner.execute(
      'SELECT * FROM inventory_reservations WHERE order_id = ? FOR UPDATE',
      [orderId]
    );

    if (resRows.length === 0) {
      if (isDedicatedConnection) await runner.commit();
      return { fulfilled: false, reason: 'No reservation record found' };
    }

    const reservation = resRows[0];

    // Idempotency: only fulfill if currently RESERVED
    if (reservation.status !== 'RESERVED') {
      if (isDedicatedConnection) await runner.commit();
      return {
        fulfilled: false,
        reason: `Reservation is already in "${reservation.status}" state`,
        status: reservation.status,
      };
    }

    const numQty = parseFloat(reservation.reserved_quantity);
    const listingId = reservation.listing_id;

    // 2. Transition reservation status to FULFILLED
    await runner.execute(
      "UPDATE inventory_reservations SET status = 'FULFILLED', updated_at = NOW() WHERE id = ? AND status = 'RESERVED'",
      [reservation.id]
    );

    // 3. Read previous listing available quantity
    const [listingRows] = await runner.execute(
      'SELECT available_quantity, reserved_quantity, fulfilled_quantity, unit FROM waste_listings WHERE id = ? FOR UPDATE',
      [listingId]
    );

    const available = listingRows.length > 0 ? parseFloat(listingRows[0].available_quantity) : 0;
    const unit = listingRows.length > 0 ? listingRows[0].unit || 'kg' : 'kg';

    // 4. Update listing inventory: move from reserved to fulfilled
    await runner.execute(
      `UPDATE waste_listings
       SET reserved_quantity = GREATEST(0.00, reserved_quantity - ?),
           fulfilled_quantity = fulfilled_quantity + ?
       WHERE id = ?`,
      [numQty, numQty, listingId]
    );

    // 5. Log ledger transaction
    const txId = crypto.randomUUID();
    await runner.execute(
      `INSERT INTO inventory_transactions (
        id, listing_id, order_id, transaction_type, quantity,
        previous_available_quantity, resulting_available_quantity,
        actor_id, source, note
      ) VALUES (?, ?, ?, 'FULFILLMENT', ?, ?, ?, ?, 'ORDER_DELIVERY', ?)`,
      [
        txId,
        listingId,
        orderId,
        numQty,
        available,
        available, // Available stays unchanged during fulfillment; reserved moves to fulfilled
        actorId,
        note || `Fulfilled ${numQty} ${unit} for delivered Order #${orderId.slice(0, 8).toUpperCase()}`,
      ]
    );

    if (isDedicatedConnection) await runner.commit();

    return {
      fulfilled: true,
      quantity: numQty,
    };
  } catch (err) {
    if (isDedicatedConnection) await runner.rollback();
    throw err;
  } finally {
    if (isDedicatedConnection) runner.release();
  }
}

/**
 * Retrieves the live inventory breakdown for a listing.
 */
async function getListingInventory(listingId) {
  const [rows] = await pool.execute(
    `SELECT id, user_id, title, waste_type, quantity,
            available_quantity, reserved_quantity, fulfilled_quantity,
            unit, price_per_kg, status
     FROM waste_listings
     WHERE id = ? LIMIT 1`,
    [listingId]
  );

  if (rows.length === 0) {
    const err = new Error('Listing not found.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const row = rows[0];
  const total = parseFloat(row.quantity);
  const available = parseFloat(row.available_quantity);
  const reserved = parseFloat(row.reserved_quantity);
  const fulfilled = parseFloat(row.fulfilled_quantity);

  return {
    listing_id: row.id,
    seller_id: row.user_id,
    title: row.title,
    waste_type: row.waste_type,
    unit: row.unit || 'kg',
    total_quantity: total,
    available_quantity: available,
    reserved_quantity: reserved,
    fulfilled_quantity: fulfilled,
    price_per_kg: parseFloat(row.price_per_kg),
    status: row.status,
    is_in_stock: available > 0,
    balanced: Math.abs(total - (available + reserved + fulfilled)) < 0.01,
  };
}

/**
 * Retrieves inventory ledger transaction history for a listing.
 */
async function getInventoryHistory(listingId, limit = 50) {
  const [rows] = await pool.execute(
    `SELECT t.*, u.display_name as actor_name
     FROM inventory_transactions t
     LEFT JOIN users u ON t.actor_id = u.id
     WHERE t.listing_id = ?
     ORDER BY t.created_at DESC
     LIMIT ?`,
    [listingId, parseInt(limit, 10)]
  );

  return rows.map((r) => ({
    id: r.id,
    listing_id: r.listing_id,
    order_id: r.order_id,
    transaction_type: r.transaction_type,
    quantity: parseFloat(r.quantity),
    previous_available_quantity: parseFloat(r.previous_available_quantity),
    resulting_available_quantity: parseFloat(r.resulting_available_quantity),
    actor_id: r.actor_id,
    actor_name: r.actor_name || null,
    source: r.source,
    note: r.note,
    created_at: r.created_at,
  }));
}

/**
 * Logs an initial inventory ADDITION transaction when a listing is created.
 */
async function logListingCreation({
  listingId,
  quantity,
  actorId,
  unit = 'kg',
  connection = null,
}) {
  const runner = connection || pool;
  const numQty = parseFloat(quantity);
  const txId = crypto.randomUUID();

  await runner.execute(
    `INSERT INTO inventory_transactions (
      id, listing_id, order_id, transaction_type, quantity,
      previous_available_quantity, resulting_available_quantity,
      actor_id, source, note
    ) VALUES (?, ?, NULL, 'ADDITION', ?, 0.00, ?, ?, 'LISTING_CREATION', ?)`,
    [
      txId,
      listingId,
      numQty,
      numQty,
      actorId,
      `Initial stock addition of ${numQty} ${unit}`,
    ]
  );
}

module.exports = {
  reserveInventory,
  releaseInventory,
  fulfillInventory,
  getListingInventory,
  getInventoryHistory,
  logListingCreation,
};
