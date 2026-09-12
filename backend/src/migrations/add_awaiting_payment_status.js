/**
 * migrations/add_awaiting_payment_status.js
 * -----------------------------------------
 * Migration to add 'awaiting_payment' to collection_requests.status ENUM in MySQL.
 * Preserves all existing records and constraints.
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function up() {
  console.log('Running migration: Adding "awaiting_payment" to collection_requests.status ENUM...');
  const connection = await pool.getConnection();

  try {
    // 1. Alter collection_requests status ENUM
    await connection.execute(`
      ALTER TABLE collection_requests 
      MODIFY COLUMN status ENUM(
        'pending',
        'awaiting_payment',
        'confirmed',
        'in_transit',
        'delivered',
        'cancelled',
        'disputed'
      ) NOT NULL DEFAULT 'pending'
    `);
    console.log('✅ Successfully altered collection_requests.status to include awaiting_payment');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

up();
