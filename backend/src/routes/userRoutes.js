/**
 * routes/userRoutes.js
 * --------------------
 * User routes for Rubbish Revamp backend.
 *
 * Routes:
 *   GET /api/users/me  → Get authenticated user's profile (protected)
 */

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

const router = express.Router();

// GET /api/users/me — protected, requires valid Bearer JWT
router.get('/me', authMiddleware, userController.getMe);

module.exports = router;
