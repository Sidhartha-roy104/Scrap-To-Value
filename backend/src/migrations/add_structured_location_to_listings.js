/**
 * migrations/add_structured_location_to_listings.js
 * --------------------------------------------------
 * Add structured location fields (country, state, district, city) to waste_listings table.
 *
 * New columns:
 *   - country   VARCHAR(100) NULL DEFAULT 'India'
 *   - state     VARCHAR(100) NULL DEFAULT NULL
 *   - district  VARCHAR(100) NULL DEFAULT NULL
 *   - city      VARCHAR(100) NULL DEFAULT NULL
 *
 * Safe: Checks INFORMATION_SCHEMA.COLUMNS before altering table.
 * Non-destructive: Existing listings remain completely intact.
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
  console.log('MIGRATION: add_structured_location_to_listings');
  console.log('================================================================\n');

  const connection = await pool.getConnection();

  try {
    await addColumnIfNotExists(connection, 'waste_listings', 'country', "VARCHAR(100) NULL DEFAULT 'India'");
    await addColumnIfNotExists(connection, 'waste_listings', 'state', 'VARCHAR(100) NULL DEFAULT NULL');
    await addColumnIfNotExists(connection, 'waste_listings', 'district', 'VARCHAR(100) NULL DEFAULT NULL');
    await addColumnIfNotExists(connection, 'waste_listings', 'city', 'VARCHAR(100) NULL DEFAULT NULL');

    console.log('\n✅ Migration completed successfully!');
    console.log('   waste_listings table now supports structured location fields.\n');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

up();
