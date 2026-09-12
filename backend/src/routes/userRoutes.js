/**
 * routes/userRoutes.js
 * --------------------
 * User routes for Rubbish Revamp backend.
 *
 * Routes:
 *   GET   /api/users/me  → Get authenticated user's profile (protected)
 *   PATCH /api/users/me  → Update authenticated user's profile (protected) — Phase 13
 */

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');
const { updateProfileRules } = require('../validators/userValidator');

const router = express.Router();

// GET /api/users/me — protected, requires valid Bearer JWT
router.get('/me', authMiddleware, userController.getMe);

// PATCH /api/users/me — update own business profile (Phase 13)
router.patch('/me', authMiddleware, updateProfileRules, userController.updateMe);

module.exports = router;
