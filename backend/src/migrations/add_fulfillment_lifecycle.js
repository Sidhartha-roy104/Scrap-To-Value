/**
 * migrations/add_fulfillment_lifecycle.js
 * ---------------------------------------
 * Migration to support Phase 6 Fulfillment, Delivery & Order Completion:
 * 1. Alter collection_requests status ENUM to include 'ready_for_pickup'.
 * 2. Add timestamp & notes columns to collection_requests:
 *    - ready_at
 *    - dispatched_at
 *    - delivered_at
 *    - fulfillment_notes
 * 3. Create order_fulfillment_activity append-only audit ledger.
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function up() {
  console.log('Running migration: add_fulfillment_lifecycle...');
  const connection = await pool.getConnection();

  try {
    // 1. Alter collection_requests status ENUM
    console.log('1. Altering collection_requests.status ENUM...');
    await connection.execute(`
      ALTER TABLE collection_requests 
      MODIFY COLUMN status ENUM(
        'pending',
        'awaiting_payment',
        'confirmed',
        'ready_for_pickup',
        'in_transit',
        'delivered',
        'cancelled',
        'disputed'
      ) NOT NULL DEFAULT 'pending'
    `);
    console.log('   Status ENUM updated with "ready_for_pickup".');

    // 2. Add columns if not already existing
    console.log('2. Adding fulfillment timestamp columns to collection_requests...');
    const [cols] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collection_requests'
    `);
    const existingCols = new Set(cols.map((c) => c.COLUMN_NAME));

    if (!existingCols.has('ready_at')) {
      await connection.execute(`ALTER TABLE collection_requests ADD COLUMN ready_at DATETIME DEFAULT NULL`);
      console.log('   Added ready_at');
    }
    if (!existingCols.has('dispatched_at')) {
      await connection.execute(`ALTER TABLE collection_requests ADD COLUMN dispatched_at DATETIME DEFAULT NULL`);
      console.log('   Added dispatched_at');
    }
    if (!existingCols.has('delivered_at')) {
      await connection.execute(`ALTER TABLE collection_requests ADD COLUMN delivered_at DATETIME DEFAULT NULL`);
      console.log('   Added delivered_at');
    }
    if (!existingCols.has('fulfillment_notes')) {
      await connection.execute(`ALTER TABLE collection_requests ADD COLUMN fulfillment_notes TEXT DEFAULT NULL`);
      console.log('   Added fulfillment_notes');
    }

    // 3. Create order_fulfillment_activity table
    console.log('3. Creating order_fulfillment_activity table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_fulfillment_activity (
        id CHAR(36) PRIMARY KEY,
        request_id CHAR(36) NOT NULL,
        previous_status VARCHAR(50) NULL,
        new_status VARCHAR(50) NOT NULL,
        changed_by CHAR(36) NOT NULL,
        actor_role VARCHAR(20) NOT NULL,
        notes TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_activity_request FOREIGN KEY (request_id) REFERENCES collection_requests(id) ON DELETE CASCADE,
        CONSTRAINT fk_activity_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_activity_request (request_id),
        INDEX idx_activity_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('   order_fulfillment_activity table verified/created.');

    console.log('✅ Phase 6 migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

up();
