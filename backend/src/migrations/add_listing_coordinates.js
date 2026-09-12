/**
 * migrations/add_listing_coordinates.js
 * --------------------------------------
 * Phase 13A Migration: Add pickup location coordinate fields to waste_listings table.
 *
 * New columns:
 *   - latitude   DECIMAL(10, 7) NULL DEFAULT NULL
 *   - longitude  DECIMAL(10, 7) NULL DEFAULT NULL
 *
 * Safe: Checks INFORMATION_SCHEMA.COLUMNS before altering table.
 * Non-destructive: Existing listings remain completely intact with NULL coordinates.
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
  console.log('\n======================================================');
  console.log('PHASE 13A MIGRATION: add_listing_coordinates');
  console.log('======================================================\n');

  const connection = await pool.getConnection();

  try {
    await addColumnIfNotExists(connection, 'waste_listings', 'latitude', 'DECIMAL(10, 7) NULL DEFAULT NULL');
    await addColumnIfNotExists(connection, 'waste_listings', 'longitude', 'DECIMAL(10, 7) NULL DEFAULT NULL');

    console.log('\n✅ Phase 13A migration completed successfully!');
    console.log('   waste_listings table now supports latitude and longitude coordinates.\n');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

up();
