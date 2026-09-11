/**
 * migrations/add_payment_tables.js
 * --------------------------------
 * Migration script for Phase 5:
 * 1. Creates `payments` table.
 * 2. Creates `payment_transactions` audit ledger table.
 */

const { pool } = require('../config/db');

async function runMigration() {
  const connection = await pool.getConnection();
  try {
    console.log('[Migration] Starting Phase 5 payment migration...');

    // 1. Create payments table
    console.log('[Migration] Creating payments table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id CHAR(36) PRIMARY KEY,
        request_id CHAR(36) NOT NULL,
        buyer_id CHAR(36) NOT NULL,
        seller_id CHAR(36) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        payment_method VARCHAR(50) NOT NULL DEFAULT 'mock',
        provider VARCHAR(50) NOT NULL DEFAULT 'mock',
        provider_order_id VARCHAR(100) NULL,
        provider_payment_id VARCHAR(100) NULL,
        provider_signature VARCHAR(255) NULL,
        status ENUM('PENDING','PROCESSING','SUCCEEDED','FAILED','CANCELLED','REFUND_PENDING','REFUNDED') NOT NULL DEFAULT 'PENDING',
        failure_reason TEXT NULL,
        idempotency_key VARCHAR(100) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        paid_at DATETIME NULL,
        failed_at DATETIME NULL,
        refunded_at DATETIME NULL,
        INDEX idx_pay_request (request_id),
        INDEX idx_pay_buyer (buyer_id),
        INDEX idx_pay_seller (seller_id),
        INDEX idx_pay_provider_order (provider_order_id),
        INDEX idx_pay_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // 2. Create payment_transactions table
    console.log('[Migration] Creating payment_transactions audit ledger table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id CHAR(36) PRIMARY KEY,
        payment_id CHAR(36) NOT NULL,
        request_id CHAR(36) NOT NULL,
        event_type ENUM('PAYMENT_CREATED','PAYMENT_PROCESSING','PAYMENT_SUCCEEDED','PAYMENT_FAILED','PAYMENT_CANCELLED','REFUND_REQUESTED','REFUND_SUCCEEDED','REFUND_FAILED') NOT NULL,
        provider VARCHAR(50) NOT NULL DEFAULT 'mock',
        provider_reference VARCHAR(100) NULL,
        amount DECIMAL(12,2) NOT NULL,
        previous_status VARCHAR(50) NULL,
        resulting_status VARCHAR(50) NOT NULL,
        actor_id CHAR(36) NULL,
        source VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
        note TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ptx_payment (payment_id),
        INDEX idx_ptx_request (request_id),
        INDEX idx_ptx_event (event_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    console.log('[Migration] Phase 5 payment migration completed successfully.');
  } catch (err) {
    console.error('[Migration] Error during payment migration:', err);
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
