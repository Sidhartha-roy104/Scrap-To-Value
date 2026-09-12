/**
 * migrations/update_listing_status_column.js
 * ------------------------------------------
 * Updates waste_listings.status from restrictive ENUM to VARCHAR(32)
 * to support moderation statuses (active, inactive, flagged, sold, Available).
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function up() {
  console.log('Running migration: update_listing_status_column...');
  const connection = await pool.getConnection();

  try {
    console.log('Modifying waste_listings.status column to VARCHAR(32)...');
    await connection.execute(`
      ALTER TABLE waste_listings 
      MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'Available'
    `);
    console.log('Successfully updated waste_listings.status to VARCHAR(32).');
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  up()
    .then(() => {
      console.log('Migration finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal error during migration:', err);
      process.exit(1);
    });
}

module.exports = { up };
