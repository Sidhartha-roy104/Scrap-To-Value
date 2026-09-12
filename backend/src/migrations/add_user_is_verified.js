/**
 * migrations/add_user_is_verified.js
 * -----------------------------------
 * Phase 14 Migration: Add simple supplier verification column to users table.
 *
 * New column:
 *   - is_verified BOOLEAN NOT NULL DEFAULT FALSE
 *
 * Safe: Checks INFORMATION_SCHEMA.COLUMNS before altering table.
 * Non-destructive: Existing users default to false (unverified).
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function addColumnIfNotExists(connection, table, column, definition) {
  const [cols] = await connection.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (cols.length === 0) {
    await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`   ✓ Added ${column} to ${table}`);
  } else {
    console.log(`   · ${column} already present in ${table}`);
  }
}

async function up() {
  console.log('\n================================================================');
  console.log('PHASE 14 MIGRATION: add_user_is_verified');
  console.log('================================================================\n');

  const connection = await pool.getConnection();

  try {
    await addColumnIfNotExists(connection, 'users', 'is_verified', 'BOOLEAN NOT NULL DEFAULT FALSE');

    console.log('\n✅ Phase 14 migration completed successfully!');
    console.log('   users table now supports is_verified status.\n');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

up();
