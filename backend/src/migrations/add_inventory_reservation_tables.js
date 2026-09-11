/**
 * migrations/add_inventory_reservation_tables.js
 * ----------------------------------------------
 * Migration script for Phase 4:
 * 1. Extends `waste_listings` with available_quantity, reserved_quantity, fulfilled_quantity.
 * 2. Creates `inventory_reservations` table.
 * 3. Creates `inventory_transactions` table.
 * 4. Initializes quantities on existing listings and syncs existing active requests.
 */

const { pool } = require('../config/db');

async function runMigration() {
  const connection = await pool.getConnection();
  try {
    console.log('[Migration] Starting Phase 4 inventory migration...');

    // 1. Check existing columns in waste_listings
    const [existingCols] = await connection.execute('DESCRIBE waste_listings');
    const colNames = existingCols.map((c) => c.Field);

    if (!colNames.includes('available_quantity')) {
      console.log('[Migration] Adding available_quantity to waste_listings...');
      await connection.execute(
        'ALTER TABLE waste_listings ADD COLUMN available_quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER quantity'
      );
    }

    if (!colNames.includes('reserved_quantity')) {
      console.log('[Migration] Adding reserved_quantity to waste_listings...');
      await connection.execute(
        'ALTER TABLE waste_listings ADD COLUMN reserved_quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER available_quantity'
      );
    }

    if (!colNames.includes('fulfilled_quantity')) {
      console.log('[Migration] Adding fulfilled_quantity to waste_listings...');
      await connection.execute(
        'ALTER TABLE waste_listings ADD COLUMN fulfilled_quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER reserved_quantity'
      );
    }

    // 2. Initialize default available_quantity from quantity for existing listings where all are 0
    console.log('[Migration] Initializing available_quantity for existing listings...');
    await connection.execute(`
      UPDATE waste_listings 
      SET available_quantity = quantity, reserved_quantity = 0.00, fulfilled_quantity = 0.00
      WHERE available_quantity = 0.00 AND reserved_quantity = 0.00 AND fulfilled_quantity = 0.00
    `);

    // 3. Create inventory_reservations table
    console.log('[Migration] Creating inventory_reservations table...');
    await connection.execute('DROP TABLE IF EXISTS inventory_reservations');
    await connection.execute(`
      CREATE TABLE inventory_reservations (
        id CHAR(36) PRIMARY KEY,
        order_id CHAR(36) NOT NULL UNIQUE,
        listing_id CHAR(36) NOT NULL,
        seller_id CHAR(36) NOT NULL,
        buyer_id CHAR(36) NOT NULL,
        reserved_quantity DECIMAL(10,2) NOT NULL,
        status ENUM('RESERVED','RELEASED','FULFILLED','CANCELLED') NOT NULL DEFAULT 'RESERVED',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_res_listing (listing_id),
        INDEX idx_res_order (order_id),
        INDEX idx_res_seller (seller_id),
        INDEX idx_res_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // 4. Create inventory_transactions table
    console.log('[Migration] Creating inventory_transactions table...');
    await connection.execute('DROP TABLE IF EXISTS inventory_transactions');
    await connection.execute(`
      CREATE TABLE inventory_transactions (
        id CHAR(36) PRIMARY KEY,
        listing_id CHAR(36) NOT NULL,
        order_id CHAR(36) NULL,
        transaction_type ENUM('ADDITION','RESERVATION','RELEASE','FULFILLMENT','ADJUSTMENT') NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        previous_available_quantity DECIMAL(10,2) NOT NULL,
        resulting_available_quantity DECIMAL(10,2) NOT NULL,
        actor_id CHAR(36) NULL,
        source VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
        note TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tx_listing (listing_id),
        INDEX idx_tx_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // 5. Backfill reservations for existing active requests if any
    const [existingReqs] = await connection.execute(`
      SELECT r.id, r.listing_id, r.buyer_id, r.seller_id, r.quantity, r.status
      FROM collection_requests r
      LEFT JOIN inventory_reservations res ON r.id = res.order_id
      WHERE res.id IS NULL AND r.listing_id IS NOT NULL
    `);

    if (existingReqs.length > 0) {
      console.log(`[Migration] Backfilling ${existingReqs.length} existing requests into inventory_reservations...`);
      for (const req of existingReqs) {
        let resStatus = 'RESERVED';
        if (req.status === 'cancelled') resStatus = 'CANCELLED';
        else if (req.status === 'delivered') resStatus = 'FULFILLED';

        await connection.execute(
          `INSERT INTO inventory_reservations (id, order_id, listing_id, seller_id, buyer_id, reserved_quantity, status)
           VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
          [req.id, req.listing_id, req.seller_id, req.buyer_id, req.quantity, resStatus]
        );
      }
    }

    console.log('[Migration] Phase 4 inventory migration completed successfully.');
  } catch (err) {
    console.error('[Migration] Error during migration:', err);
    throw err;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigration };
