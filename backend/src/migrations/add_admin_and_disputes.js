/**
 * migrations/add_admin_and_disputes.js
 * -------------------------------------
 * Migration for Phase 7:
 * 1. Modify users.role ENUM to include 'admin': ENUM('buyer', 'seller', 'admin')
 * 2. Ensure is_active column exists on users (TINYINT(1) DEFAULT 1)
 * 3. Seed default system admin account (admin@rubbishrevamp.dev / Password123!)
 * 4. Create order_disputes table
 * 5. Create dispute_activity table
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function up() {
  console.log('Running migration: add_admin_and_disputes...');
  const connection = await pool.getConnection();

  try {
    // 1. Modify users.role ENUM
    console.log('1. Altering users.role ENUM to include "admin"...');
    await connection.execute(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('buyer', 'seller', 'admin') NOT NULL DEFAULT 'buyer'
    `);
    console.log('   users.role altered successfully.');

    // 2. Ensure is_active exists
    console.log('2. Checking users.is_active column...');
    const [cols] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_active'
    `);
    if (cols.length === 0) {
      await connection.execute(`ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`);
      console.log('   Added is_active column to users.');
    } else {
      console.log('   is_active column already present.');
    }

    // 3. Create or verify default Admin User
    console.log('3. Seeding / verifying system admin user...');
    const adminEmail = 'admin@rubbishrevamp.dev';
    const [adminRows] = await connection.execute('SELECT id, role FROM users WHERE email = ?', [adminEmail]);

    if (adminRows.length === 0) {
      const passwordHash = await bcrypt.hash('Password123!', 12);
      const adminId = 'a1b2c3d4-9999-0000-0000-000000000001';
      await connection.execute(
        `INSERT INTO users (id, email, password_hash, role, display_name, is_active)
         VALUES (?, ?, ?, 'admin', 'System Administrator', 1)`,
        [adminId, adminEmail, passwordHash]
      );
      console.log('   Admin user created (admin@rubbishrevamp.dev).');
    } else {
      await connection.execute("UPDATE users SET role = 'admin', is_active = 1 WHERE email = ?", [adminEmail]);
      console.log('   Existing admin user verified.');
    }

    // 4. Create order_disputes table
    console.log('4. Creating order_disputes table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_disputes (
        id CHAR(36) PRIMARY KEY,
        request_id CHAR(36) NOT NULL,
        raised_by CHAR(36) NOT NULL,
        user_role ENUM('buyer', 'seller') NOT NULL,
        reason VARCHAR(255) NOT NULL,
        description TEXT DEFAULT NULL,
        status ENUM('open', 'under_review', 'resolved', 'rejected', 'closed') NOT NULL DEFAULT 'open',
        admin_resolution TEXT DEFAULT NULL,
        admin_notes TEXT DEFAULT NULL,
        resolved_by CHAR(36) DEFAULT NULL,
        resolved_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_disputes_request FOREIGN KEY (request_id) REFERENCES collection_requests(id) ON DELETE CASCADE,
        CONSTRAINT fk_disputes_user FOREIGN KEY (raised_by) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_disputes_admin FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_disputes_request (request_id),
        INDEX idx_disputes_status (status),
        INDEX idx_disputes_raised_by (raised_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('   order_disputes table verified/created.');

    // 5. Create dispute_activity table
    console.log('5. Creating dispute_activity table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS dispute_activity (
        id CHAR(36) PRIMARY KEY,
        dispute_id CHAR(36) NOT NULL,
        actor_id CHAR(36) NOT NULL,
        actor_role VARCHAR(20) NOT NULL,
        action VARCHAR(100) NOT NULL,
        previous_status VARCHAR(50) DEFAULT NULL,
        new_status VARCHAR(50) NOT NULL,
        notes TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_dispute_act_dispute FOREIGN KEY (dispute_id) REFERENCES order_disputes(id) ON DELETE CASCADE,
        CONSTRAINT fk_dispute_act_user FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_dispute_act_dispute (dispute_id),
        INDEX idx_dispute_act_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('   dispute_activity table verified/created.');

    console.log('✅ Phase 7 migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

up();
