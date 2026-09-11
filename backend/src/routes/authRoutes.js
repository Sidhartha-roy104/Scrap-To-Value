/**
 * routes/authRoutes.js
 * ---------------------
 * Auth API route definitions for Rubbish Revamp.
 *
 * Routes:
 *   POST /api/auth/register  → Create new account
 *   POST /api/auth/login     → Authenticate + get JWT
 *   GET  /api/auth/me        → Get current user (protected)
 *   POST /api/auth/logout    → Client-side logout acknowledgement
 */

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { registerRules, loginRules } = require('../validators/authValidator');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/register', registerRules, authController.register);
router.post('/login', loginRules, authController.login);
router.post('/logout', authController.logout);

// Protected routes (require valid JWT)
router.get('/me', authMiddleware, authController.me);

// Placeholder routes — Phase 3 (require email delivery)
// router.post('/forgot-password', authController.forgotPassword);
// router.post('/reset-password',  authController.resetPassword);

module.exports = router;
