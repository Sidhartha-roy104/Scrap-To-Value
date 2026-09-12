/**
 * migrations/add_admin_system_settings_and_kyc_notes.js
 * ----------------------------------------------------
 * Migration to support:
 * 1. kyc_notes column on users table for seller verification notes
 * 2. system_settings table for administrative operational configurations
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function up() {
  console.log('Running migration: add_admin_system_settings_and_kyc_notes...');
  const connection = await pool.getConnection();

  try {
    // 1. Check/Add kyc_notes on users
    console.log('1. Checking users.kyc_notes column...');
    const [cols] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'kyc_notes'
    `);
    if (cols.length === 0) {
      await connection.execute(`ALTER TABLE users ADD COLUMN kyc_notes TEXT NULL`);
      console.log('   Added kyc_notes column to users.');
    } else {
      console.log('   kyc_notes column already present.');
    }

    // 2. Create system_settings table
    console.log('2. Creating system_settings table if not exists...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key_name VARCHAR(64) PRIMARY KEY,
        value_text TEXT NOT NULL,
        description VARCHAR(255) NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   system_settings table ready.');

    // 3. Seed default system settings
    console.log('3. Seeding default system settings...');
    const defaultSettings = [
      ['platform_name', 'Rubbish Revamp B2B Marketplace', 'Official marketplace platform branding'],
      ['support_email', 'ops@rubbishrevamp.dev', 'Operational and seller assistance contact email'],
      ['default_order_timeout_hours', '72', 'Hours before unaccepted requests auto-expire'],
      ['dispute_escalation_days', '5', 'Days before an unresolved dispute is marked urgent'],
      ['min_order_quantity_kg', '10', 'Global minimum allowable order quantity in kilograms'],
      ['maintenance_mode', 'false', 'Maintenance flag for non-admin platform traffic'],
    ];

    for (const [key, val, desc] of defaultSettings) {
      await connection.execute(
        `INSERT INTO system_settings (key_name, value_text, description)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        [key, val, desc]
      );
    }
    console.log('   Default system settings seeded successfully.');

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    connection.release();
    await pool.end();
  }
}

if (require.main === module) {
  up().catch(() => process.exit(1));
}

module.exports = { up };
