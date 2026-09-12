/**
 * migrations/add_reviews_table.js
 * --------------------------------
 * Migration for Phase 9: Simple Reviews, Ratings & Trust System
 *
 * Creates the `reviews` table:
 * - id CHAR(36) PRIMARY KEY
 * - request_id CHAR(36) NOT NULL (FK -> collection_requests(id) ON DELETE CASCADE)
 * - reviewer_id CHAR(36) NOT NULL (FK -> users(id) ON DELETE CASCADE)
 * - reviewee_id CHAR(36) NOT NULL (FK -> users(id) ON DELETE CASCADE)
 * - reviewer_role ENUM('buyer', 'seller') NOT NULL
 * - rating TINYINT NOT NULL
 * - comment TEXT NULL
 * - status ENUM('visible', 'hidden') NOT NULL DEFAULT 'visible'
 * - created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
 * - updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 * - UNIQUE KEY uq_request_reviewer (request_id, reviewer_id)
 * - INDEX idx_reviews_reviewee (reviewee_id, status)
 * - INDEX idx_reviews_reviewer (reviewer_id)
 * - INDEX idx_reviews_request (request_id)
 * - INDEX idx_reviews_status (status)
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function up() {
  console.log('Running migration: add_reviews_table...');
  const connection = await pool.getConnection();

  try {
    // 1. Create `reviews` table if it does not exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id CHAR(36) NOT NULL PRIMARY KEY,
        request_id CHAR(36) NOT NULL,
        reviewer_id CHAR(36) NOT NULL,
        reviewee_id CHAR(36) NOT NULL,
        reviewer_role ENUM('buyer', 'seller') NOT NULL,
        rating TINYINT NOT NULL,
        comment TEXT NULL,
        status ENUM('visible', 'hidden') NOT NULL DEFAULT 'visible',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        CONSTRAINT fk_reviews_request FOREIGN KEY (request_id) REFERENCES collection_requests(id) ON DELETE CASCADE,
        CONSTRAINT fk_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_reviews_reviewee FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),

        UNIQUE KEY uq_request_reviewer (request_id, reviewer_id),
        INDEX idx_reviews_reviewee (reviewee_id, status),
        INDEX idx_reviews_reviewer (reviewer_id),
        INDEX idx_reviews_request (request_id),
        INDEX idx_reviews_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    console.log('✅ `reviews` table checked/created successfully.');
  } catch (error) {
    console.error('❌ Migration add_reviews_table failed:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

async function down() {
  console.log('Rolling back migration: add_reviews_table...');
  const connection = await pool.getConnection();
  try {
    await connection.query('DROP TABLE IF EXISTS reviews');
    console.log('✅ `reviews` table dropped.');
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  up()
    .then(() => {
      console.log('Migration completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { up, down };
