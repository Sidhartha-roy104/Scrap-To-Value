/**
 * services/requestService.js
 * --------------------------
 * Business logic for collection requests (buyer scrap requests) connected to MySQL.
 * Integrates atomic inventory reservation, release on cancellation, and fulfillment on delivery.
 */

const crypto = require('crypto');
const { pool } = require('../config/db');
const inventoryService = require('./inventoryService');
const notificationService = require('./notificationService');

/**
 * Formats a raw database row into a structured response object.
 */
function formatRequest(row) {
  let trackingUpdates = [];
  if (row.tracking_updates) {
    try {
      trackingUpdates = typeof row.tracking_updates === 'string'
        ? JSON.parse(row.tracking_updates)
        : row.tracking_updates;
    } catch {
      trackingUpdates = [];
    }
  }

  return {
    id: row.id,
    listing_id: row.listing_id,
    buyer_id: row.buyer_id,
    seller_id: row.seller_id,
    waste_type: row.waste_type,
    quantity: parseFloat(row.quantity),
    price_per_kg: parseFloat(row.price_per_kg),
    amount: parseFloat(row.amount),
    buyer_message: row.buyer_message ?? null,
    status: row.status,
    tracking_updates: trackingUpdates,
    estimated_delivery: row.estimated_delivery ?? null,
    delivery_otp: row.delivery_otp ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ready_at: row.ready_at ?? null,
    dispatched_at: row.dispatched_at ?? null,
    delivered_at: row.delivered_at ?? null,
    fulfillment_notes: row.fulfillment_notes ?? null,
    reservation: row.reservation_status
      ? {
          status: row.reservation_status,
          reserved_quantity: parseFloat(row.reservation_quantity || row.quantity),
        }
      : undefined,
    payment: row.payment_status
      ? {
          id: row.payment_id,
          status: row.payment_status,
          amount: parseFloat(row.payment_amount || row.amount),
          payment_method: row.payment_method || null,
          paid_at: row.payment_paid_at || null,
        }
      : undefined,
    listing: row.listing_title
      ? {
          id: row.listing_id,
          title: row.listing_title,
          unit: row.listing_unit || 'kg',
          image_url: row.listing_image_url || null,
          location: row.listing_location || null,
          total_quantity: row.listing_quantity !== undefined && row.listing_quantity !== null
            ? parseFloat(row.listing_quantity)
            : undefined,
          available_quantity: row.listing_available_quantity !== undefined && row.listing_available_quantity !== null
            ? parseFloat(row.listing_available_quantity)
            : (row.listing_quantity ? parseFloat(row.listing_quantity) : undefined),
          reserved_quantity: row.listing_reserved_quantity !== undefined && row.listing_reserved_quantity !== null
            ? parseFloat(row.listing_reserved_quantity)
            : 0,
        }
      : undefined,
    buyer: row.buyer_name
      ? {
          id: row.buyer_id,
          name: row.buyer_name,
          email: row.buyer_email,
          company: row.buyer_company ?? null,
          phone: row.buyer_phone ?? null,
        }
      : undefined,
    seller: row.seller_name
      ? {
          id: row.seller_id,
          name: row.seller_name,
          email: row.seller_email,
          company: row.seller_company ?? null,
          phone: row.seller_phone ?? null,
        }
      : undefined,
  };
}

/**
 * Creates a new collection request for a scrap listing with atomic inventory reservation.
 */
async function createRequest({
  buyerId,
  userRole,
  listing_id,
  requested_quantity,
  buyer_message = null,
}) {
  // 1. Role verification: Only buyers can initiate a scrap request
  if (userRole && userRole !== 'buyer') {
    const err = new Error('Access denied: Only buyers can request scrap listings.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  if (!listing_id) {
    const err = new Error('listing_id is required.');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const numQty = parseFloat(requested_quantity);
  if (isNaN(numQty) || numQty <= 0) {
    const err = new Error('Requested quantity must be a positive number greater than 0.');
    err.code = 'INVALID_QUANTITY';
    throw err;
  }

  // 2. Perform listing check and reservation in a managed database transaction
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Row lock the listing
    const [listingRows] = await connection.execute(
      'SELECT * FROM waste_listings WHERE id = ? FOR UPDATE',
      [listing_id]
    );

    if (listingRows.length === 0) {
      const err = new Error('Listing not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const listing = listingRows[0];

    if (listing.status !== 'Available') {
      const err = new Error(`Listing is no longer available (current status: ${listing.status}).`);
      err.code = 'BAD_REQUEST';
      throw err;
    }

    if (listing.user_id === buyerId) {
      const err = new Error('You cannot request scrap from your own listing.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    const availableQty = parseFloat(listing.available_quantity);
    if (numQty > availableQty) {
      const err = new Error(
        `Only ${availableQty} ${listing.unit || 'kg'} is available for this listing.`
      );
      err.code = 'INSUFFICIENT_INVENTORY';
      err.availableQuantity = availableQty;
      throw err;
    }

    // 3. Compute trusted financial values
    const price_per_kg = parseFloat(listing.price_per_kg);
    const total_amount = parseFloat((numQty * price_per_kg).toFixed(2));
    const sellerId = listing.user_id;
    const wasteType = listing.waste_type;
    const id = crypto.randomUUID();

    // 4. Atomically reserve inventory
    await inventoryService.reserveInventory({
      listingId: listing_id,
      orderId: id,
      buyerId,
      sellerId,
      quantity: numQty,
      actorId: buyerId,
      connection,
    });

    // 5. Insert request record with status "pending"
    const initialTracking = JSON.stringify([
      {
        status: 'pending',
        timestamp: new Date().toISOString(),
        note: `Buyer submitted collection request for ${numQty} ${listing.unit || 'kg'}`,
      },
    ]);

    const sanitizedMessage = typeof buyer_message === 'string' ? buyer_message.trim() : null;

    const insertQuery = `
      INSERT INTO collection_requests (
        id, listing_id, buyer_id, seller_id, waste_type,
        quantity, price_per_kg, amount, buyer_message,
        status, tracking_updates
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `;

    await connection.execute(insertQuery, [
      id,
      listing_id,
      buyerId,
      sellerId,
      wasteType,
      numQty,
      price_per_kg,
      total_amount,
      sanitizedMessage,
      initialTracking,
    ]);

    await connection.commit();

    // Trigger non-blocking notification to seller
    try {
      await notificationService.createNotification({
        recipientId: sellerId,
        type: notificationService.NotificationTypes.ORDER_CREATED,
        title: 'New Scrap Request Received',
        message: `A buyer placed an order for ${numQty}kg of ${wasteType} (Total: ₹${total_amount}).`,
        relatedRequestId: id,
        relatedEntityType: 'order',
        relatedEntityId: id,
        link: '/orders',
        dedupKey: `order:CREATED:${id}`,
      });
    } catch (notifErr) {
      console.warn('[RequestService] Could not send request notification:', notifErr.message);
    }

    return getRequestById(id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Retrieves a single request by its ID with relational metadata and reservation details.
 */
async function getRequestById(id) {
  const query = `
    SELECT 
      r.*,
      l.title as listing_title,
      l.unit as listing_unit,
      l.image_url as listing_image_url,
      l.quantity as listing_quantity,
      l.available_quantity as listing_available_quantity,
      l.reserved_quantity as listing_reserved_quantity,
      l.location as listing_location,
      res.status as reservation_status,
      res.reserved_quantity as reservation_quantity,
      p.id as payment_id,
      p.status as payment_status,
      p.amount as payment_amount,
      p.payment_method as payment_method,
      p.paid_at as payment_paid_at,
      b.display_name as buyer_name,
      b.email as buyer_email,
      b.company_name as buyer_company,
      b.phone as buyer_phone,
      s.display_name as seller_name,
      s.email as seller_email,
      s.company_name as seller_company,
      s.phone as seller_phone
    FROM collection_requests r
    LEFT JOIN waste_listings l ON r.listing_id = l.id
    LEFT JOIN inventory_reservations res ON r.id = res.order_id
    LEFT JOIN payments p ON p.id = (
      SELECT id FROM payments WHERE request_id = r.id ORDER BY created_at DESC LIMIT 1
    )
    LEFT JOIN users b ON r.buyer_id = b.id
    LEFT JOIN users s ON r.seller_id = s.id
    WHERE r.id = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(query, [id]);
  if (rows.length === 0) {
    const err = new Error('Collection request not found.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  return formatRequest(rows[0]);
}

/**
 * Retrieves all requests associated with a user (as buyer or seller).
 */
async function getRequests({
  userId,
  userRole,
  status,
  page = 1,
  limit = 50,
} = {}) {
  const conditions = [];
  const params = [];

  if (userRole === 'buyer') {
    conditions.push('r.buyer_id = ?');
    params.push(userId);
  } else if (userRole === 'seller') {
    conditions.push('r.seller_id = ?');
    params.push(userId);
  } else {
    conditions.push('(r.buyer_id = ? OR r.seller_id = ?)');
    params.push(userId, userId);
  }

  if (status && status !== 'All') {
    conditions.push('r.status = ?');
    params.push(status);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Count total
  const countQuery = `SELECT COUNT(*) as total FROM collection_requests r ${whereClause}`;
  const [countResult] = await pool.execute(countQuery, params);
  const total = countResult[0]?.total || 0;

  // Pagination
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const query = `
    SELECT 
      r.*,
      l.title as listing_title,
      l.unit as listing_unit,
      l.image_url as listing_image_url,
      l.quantity as listing_quantity,
      l.available_quantity as listing_available_quantity,
      l.reserved_quantity as listing_reserved_quantity,
      l.location as listing_location,
      res.status as reservation_status,
      res.reserved_quantity as reservation_quantity,
      p.id as payment_id,
      p.status as payment_status,
      p.amount as payment_amount,
      p.payment_method as payment_method,
      p.paid_at as payment_paid_at,
      b.display_name as buyer_name,
      b.email as buyer_email,
      b.company_name as buyer_company,
      b.phone as buyer_phone,
      s.display_name as seller_name,
      s.email as seller_email,
      s.company_name as seller_company,
      s.phone as seller_phone
    FROM collection_requests r
    LEFT JOIN waste_listings l ON r.listing_id = l.id
    LEFT JOIN inventory_reservations res ON r.id = res.order_id
    LEFT JOIN payments p ON p.id = (
      SELECT id FROM payments WHERE request_id = r.id ORDER BY created_at DESC LIMIT 1
    )
    LEFT JOIN users b ON r.buyer_id = b.id
    LEFT JOIN users s ON r.seller_id = s.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(query, [...params, parseInt(limit, 10), offset]);

  return {
    requests: rows.map((row) => formatRequest(row)),
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Updates a request status (e.g., seller confirming, delivering, or cancelling).
 * Synchronizes inventory reservations accordingly:
 * - 'cancelled' -> Releases reserved inventory back to available quantity.
 * - 'delivered' -> Fulfills reserved inventory to fulfilled quantity.
 */
async function updateRequestStatus(id, userId, { status, note, estimated_delivery = null }) {
  const existing = await getRequestById(id);

  // 1. Authorization: Only the seller who owns this listing can update/accept/reject
  if (existing.seller_id !== userId) {
    const err = new Error('Forbidden: Only the seller who owns this listing can accept, reject, or update this request.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  const VALID_STATUSES = [
    'pending',
    'awaiting_payment',
    'confirmed',
    'ready_for_pickup',
    'in_transit',
    'delivered',
    'cancelled',
    'disputed',
  ];

  if (!VALID_STATUSES.includes(status)) {
    const err = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    err.code = 'BAD_REQUEST';
    throw err;
  }

  // 2. Idempotency on exact status
  if (existing.status === status) {
    return existing;
  }

  // Disallow direct cancellation of already delivered orders
  if (status === 'cancelled' && existing.status === 'delivered') {
    const err = new Error('Invalid status transition: Delivered orders cannot be cancelled directly.');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const ALLOWED_TRANSITIONS = {
    pending: ['awaiting_payment', 'cancelled'],
    awaiting_payment: ['confirmed', 'cancelled'],
    confirmed: ['ready_for_pickup', 'cancelled'],
    ready_for_pickup: ['in_transit', 'cancelled'],
    in_transit: ['delivered'],
    delivered: ['disputed'],
    cancelled: [],
    disputed: ['cancelled', 'delivered'],
  };

  const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
  if (!allowed.includes(status)) {
    const err = new Error(`Invalid status transition: Cannot change request from "${existing.status}" to "${status}".`);
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 3. Inventory Reservation Transitions
    if (status === 'cancelled') {
      // Release reserved inventory back to available stock
      await inventoryService.releaseInventory({
        orderId: id,
        actorId: userId,
        note: note || `Order cancelled: ${existing.status} -> cancelled`,
        connection,
      });
    } else if (status === 'delivered') {
      // Mark reserved inventory as fulfilled
      await inventoryService.fulfillInventory({
        orderId: id,
        actorId: userId,
        note: note || 'Order delivered and fulfilled',
        connection,
      });
    }

    // 4. Update request status & append tracking history
    const currentTracking = Array.isArray(existing.tracking_updates)
      ? existing.tracking_updates
      : [];

    const newTracking = [
      ...currentTracking,
      {
        status,
        timestamp: new Date().toISOString(),
        note: note || `Status updated to ${status}`,
      },
    ];

    const query = `
      UPDATE collection_requests
      SET status = ?,
          tracking_updates = ?,
          estimated_delivery = COALESCE(?, estimated_delivery),
          ready_at = CASE WHEN ? = 'ready_for_pickup' AND ready_at IS NULL THEN NOW() ELSE ready_at END,
          dispatched_at = CASE WHEN ? = 'in_transit' AND dispatched_at IS NULL THEN NOW() ELSE dispatched_at END,
          delivered_at = CASE WHEN ? = 'delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
          fulfillment_notes = COALESCE(?, fulfillment_notes)
      WHERE id = ?
    `;

    await connection.execute(query, [
      status,
      JSON.stringify(newTracking),
      estimated_delivery,
      status,
      status,
      status,
      note || null,
      id,
    ]);

    // 5. Append-only activity history
    const activityId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO order_fulfillment_activity (
        id, request_id, previous_status, new_status, changed_by, actor_role, notes
      ) VALUES (?, ?, ?, ?, ?, 'seller', ?)`,
      [
        activityId,
        id,
        existing.status,
        status,
        userId,
        note || `Status transition: ${existing.status} -> ${status}`,
      ]
    );

    await connection.commit();

    // Trigger non-blocking notifications based on target status
    if (status === 'awaiting_payment') {
      notificationService.createNotification({
        recipientId: existing.buyer_id,
        type: notificationService.NotificationTypes.ORDER_ACCEPTED,
        title: 'Order Accepted — Payment Required',
        message: `The seller accepted your order for ${existing.quantity}kg of ${existing.waste_type || 'scrap'}. Please pay ₹${existing.amount} to confirm.`,
        relatedRequestId: id,
        relatedEntityType: 'order',
        relatedEntityId: id,
        link: '/orders',
        dedupKey: `order:ACCEPTED:${id}`,
      });
    } else if (status === 'cancelled') {
      const recipientId = userId === existing.buyer_id ? existing.seller_id : existing.buyer_id;
      notificationService.createNotification({
        recipientId,
        type: notificationService.NotificationTypes.ORDER_CANCELLED,
        title: 'Order Cancelled',
        message: `Order #${id.slice(0, 8).toUpperCase()} was cancelled.`,
        relatedRequestId: id,
        relatedEntityType: 'order',
        relatedEntityId: id,
        link: '/orders',
        dedupKey: `order:CANCELLED:${id}`,
      });
    } else if (status === 'ready_for_pickup') {
      notificationService.createNotification({
        recipientId: existing.buyer_id,
        type: notificationService.NotificationTypes.READY_FOR_PICKUP,
        title: 'Order Ready for Pickup',
        message: `Order #${id.slice(0, 8).toUpperCase()} is prepared and ready for collection.`,
        relatedRequestId: id,
        relatedEntityType: 'order',
        relatedEntityId: id,
        link: '/orders',
        dedupKey: `order:READY:${id}`,
      });
    } else if (status === 'in_transit') {
      notificationService.createNotification({
        recipientId: existing.buyer_id,
        type: notificationService.NotificationTypes.ORDER_IN_TRANSIT,
        title: 'Order In Transit',
        message: `Order #${id.slice(0, 8).toUpperCase()} has been dispatched and is on its way.`,
        relatedRequestId: id,
        relatedEntityType: 'order',
        relatedEntityId: id,
        link: '/orders',
        dedupKey: `order:TRANSIT:${id}`,
      });
    } else if (status === 'delivered') {
      notificationService.createNotification({
        recipientId: existing.buyer_id,
        type: notificationService.NotificationTypes.ORDER_DELIVERED,
        title: 'Order Delivered Successfully',
        message: `Your order #${id.slice(0, 8).toUpperCase()} (${existing.quantity}kg) was successfully delivered.`,
        relatedRequestId: id,
        relatedEntityType: 'order',
        relatedEntityId: id,
        link: '/orders',
        dedupKey: `order:DELIVERED_BUYER:${id}`,
      });
      notificationService.createNotification({
        recipientId: existing.seller_id,
        type: notificationService.NotificationTypes.ORDER_DELIVERED,
        title: 'Order Fulfillment Complete',
        message: `Order #${id.slice(0, 8).toUpperCase()} has been delivered and fulfilled.`,
        relatedRequestId: id,
        relatedEntityType: 'order',
        relatedEntityId: id,
        link: '/orders',
        dedupKey: `order:DELIVERED_SELLER:${id}`,
      });
    }
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return getRequestById(id);
}

/**
 * Retrieves fulfillment activity history for an order.
 */
async function getFulfillmentHistory(requestId, userId) {
  const existing = await getRequestById(requestId);
  if (existing.buyer_id !== userId && existing.seller_id !== userId) {
    const err = new Error('Access denied to this request history.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  const [rows] = await pool.execute(
    `SELECT a.*, u.display_name as actor_name, u.role as user_role
     FROM order_fulfillment_activity a
     LEFT JOIN users u ON a.changed_by = u.id
     WHERE a.request_id = ?
     ORDER BY a.created_at ASC`,
    [requestId]
  );
  return rows;
}

module.exports = {
  createRequest,
  getRequestById,
  getRequests,
  updateRequestStatus,
  getFulfillmentHistory,
};
