/**
 * migrations/add_business_profile_fields.js
 * -----------------------------------------
 * Phase 13 Migration: Add extended business profile fields to the users table.
 *
 * New columns:
 *   - city             VARCHAR(100)  NULL  - Business city
 *   - state            VARCHAR(100)  NULL  - Business state/province
 *   - country          VARCHAR(100)  NULL  DEFAULT 'India'
 *   - company_type     VARCHAR(150)  NULL  - e.g. "Metal Foundry", "Recycling Company"
 *   - company_description TEXT       NULL  - Short about company (max 500 chars enforced at API layer)
 *
 * Safe: Uses INFORMATION_SCHEMA column checks before adding each column.
 * Non-destructive: Never removes or alters existing columns.
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
  console.log('PHASE 13 MIGRATION: add_business_profile_fields');
  console.log('======================================================\n');

  const connection = await pool.getConnection();

  try {
    await addColumnIfNotExists(connection, 'users', 'city', 'VARCHAR(100) NULL DEFAULT NULL');
    await addColumnIfNotExists(connection, 'users', 'state', 'VARCHAR(100) NULL DEFAULT NULL');
    await addColumnIfNotExists(connection, 'users', 'country', "VARCHAR(100) NULL DEFAULT 'India'");
    await addColumnIfNotExists(connection, 'users', 'company_type', 'VARCHAR(150) NULL DEFAULT NULL');
    await addColumnIfNotExists(connection, 'users', 'company_description', 'TEXT NULL DEFAULT NULL');

    console.log('\n✅ Phase 13 migration completed successfully!');
    console.log('   Users table now supports extended B2B business profile fields.\n');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

up();
