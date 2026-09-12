/**
 * migrations/add_notifications_tables.js
 * ---------------------------------------
 * Migration for Phase 8:
 * Upgrades existing `notifications` table to enterprise schema:
 * - recipient_id (renamed from user_id if needed)
 * - flexible type VARCHAR(64)
 * - related_request_id, related_dispute_id, related_entity_type, related_entity_id
 * - link, is_read, dedup_key, read_at
 * - indexes on (recipient_id, is_read), (recipient_id, created_at), request, dispute
 * Creates `notification_preferences` table.
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function up() {
  console.log('Running migration: add_notifications_tables...');
  const connection = await pool.getConnection();

  try {
    // 1. Check columns in existing `notifications` table
    console.log('1. Inspecting `notifications` table columns...');
    const [cols] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'
    `);
    const colMap = new Map(cols.map((c) => [c.COLUMN_NAME, c.DATA_TYPE]));

    // Handle user_id -> recipient_id
    if (colMap.has('user_id') && !colMap.has('recipient_id')) {
      console.log('   Renaming user_id to recipient_id in notifications...');
      await connection.execute(`
        ALTER TABLE notifications 
        CHANGE COLUMN user_id recipient_id CHAR(36) NOT NULL
      `);
    } else if (!colMap.has('recipient_id')) {
      console.log('   Adding recipient_id to notifications...');
      await connection.execute(`
        ALTER TABLE notifications 
        ADD COLUMN recipient_id CHAR(36) NOT NULL AFTER id
      `);
    }

    // Convert type from enum to VARCHAR(64)
    console.log('   Modifying type column to VARCHAR(64)...');
    await connection.execute(`
      ALTER TABLE notifications 
      MODIFY COLUMN type VARCHAR(64) NOT NULL
    `);

    // Add related_request_id
    if (!colMap.has('related_request_id')) {
      console.log('   Adding related_request_id...');
      await connection.execute(`ALTER TABLE notifications ADD COLUMN related_request_id CHAR(36) NULL AFTER message`);
    }

    // Add related_dispute_id
    if (!colMap.has('related_dispute_id')) {
      console.log('   Adding related_dispute_id...');
      await connection.execute(`ALTER TABLE notifications ADD COLUMN related_dispute_id CHAR(36) NULL AFTER related_request_id`);
    }

    // Add related_entity_type
    if (!colMap.has('related_entity_type')) {
      console.log('   Adding related_entity_type...');
      await connection.execute(`ALTER TABLE notifications ADD COLUMN related_entity_type VARCHAR(64) NULL AFTER related_dispute_id`);
    }

    // Add related_entity_id
    if (!colMap.has('related_entity_id')) {
      console.log('   Adding related_entity_id...');
      await connection.execute(`ALTER TABLE notifications ADD COLUMN related_entity_id VARCHAR(64) NULL AFTER related_entity_type`);
    }

    // Add link
    if (!colMap.has('link')) {
      console.log('   Adding link...');
      await connection.execute(`ALTER TABLE notifications ADD COLUMN link VARCHAR(255) NULL AFTER related_entity_id`);
    }

    // Add is_read
    if (!colMap.has('is_read')) {
      console.log('   Adding is_read...');
      await connection.execute(`ALTER TABLE notifications ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0 AFTER link`);
      if (colMap.has('read')) {
        await connection.execute(`UPDATE notifications SET is_read = \`read\``);
      }
    }

    // Add dedup_key
    if (!colMap.has('dedup_key')) {
      console.log('   Adding dedup_key...');
      await connection.execute(`ALTER TABLE notifications ADD COLUMN dedup_key VARCHAR(128) NULL UNIQUE AFTER is_read`);
    }

    // Add read_at
    if (!colMap.has('read_at')) {
      console.log('   Adding read_at...');
      await connection.execute(`ALTER TABLE notifications ADD COLUMN read_at DATETIME NULL AFTER created_at`);
    }

    // Check / Add Indexes
    console.log('   Checking indexes on notifications...');
    const [indexRows] = await connection.execute(`SHOW INDEX FROM notifications`);
    const indexNames = new Set(indexRows.map((r) => r.Key_name));

    if (!indexNames.has('idx_notifications_recipient_read')) {
      await connection.execute(`CREATE INDEX idx_notifications_recipient_read ON notifications (recipient_id, is_read)`);
    }
    if (!indexNames.has('idx_notifications_recipient_created')) {
      await connection.execute(`CREATE INDEX idx_notifications_recipient_created ON notifications (recipient_id, created_at)`);
    }
    if (!indexNames.has('idx_notifications_request')) {
      await connection.execute(`CREATE INDEX idx_notifications_request ON notifications (related_request_id)`);
    }
    if (!indexNames.has('idx_notifications_dispute')) {
      await connection.execute(`CREATE INDEX idx_notifications_dispute ON notifications (related_dispute_id)`);
    }

    console.log('   `notifications` table upgraded successfully.');

    // 2. Create notification_preferences table
    console.log('2. Creating `notification_preferences` table if not exists...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id CHAR(36) PRIMARY KEY,
        orders_enabled TINYINT(1) NOT NULL DEFAULT 1,
        payments_enabled TINYINT(1) NOT NULL DEFAULT 1,
        fulfillment_enabled TINYINT(1) NOT NULL DEFAULT 1,
        disputes_enabled TINYINT(1) NOT NULL DEFAULT 1,
        listings_enabled TINYINT(1) NOT NULL DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    console.log('   `notification_preferences` table ready.');

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
