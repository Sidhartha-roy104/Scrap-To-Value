/**
 * routes/healthRoutes.js
 * -----------------------
 * Health check routes for the Rubbish Revamp backend.
 *
 * Routes:
 *   GET /api/health     → Server health (always 200 if Express is running)
 *   GET /api/health/db  → Database health (200 if MySQL is reachable, 503 if not)
 */

const express = require('express');
const { testConnection } = require('../config/db');

const router = express.Router();

/**
 * GET /api/health
 * Basic server health check. Does NOT depend on MySQL.
 * Returns 200 as long as the Express server is running.
 */
router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Rubbish Revamp API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});

/**
 * GET /api/health/db
 * Database connectivity check. Returns 503 if MySQL is not reachable.
 * This is intentionally separate from the main health check.
 */
router.get('/db', async (_req, res) => {
  try {
    await testConnection();
    res.status(200).json({
      success: true,
      message: 'Database connection is healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database is not reachable',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
