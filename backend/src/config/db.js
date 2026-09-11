/**
 * config/db.js
 * -------------
 * MySQL connection pool for the Rubbish Revamp backend.
 *
 * Uses mysql2/promise for async/await support.
 * The pool is lazy — it does NOT auto-connect on require().
 * Call testConnection() to explicitly verify DB availability.
 *
 * Phase 1 Note: The server health check does NOT depend on this.
 *   /api/health returns 200 even if MySQL is not yet configured.
 *   /api/health/db will indicate database status separately.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rubbish_revamp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

/**
 * testConnection()
 * Verifies that the database is reachable.
 * Returns true on success, throws on failure.
 */
async function testConnection() {
  const connection = await pool.getConnection();
  await connection.ping();
  connection.release();
  return true;
}

module.exports = { pool, testConnection };
