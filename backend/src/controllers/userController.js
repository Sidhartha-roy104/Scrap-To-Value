/**
 * controllers/userController.js
 * ------------------------------
 * HTTP handlers for user profile and account operations.
 * Reads user data directly from MySQL users table via authService.
 */

const authService = require('../services/authService');

/**
 * GET /api/users/me
 * Returns the currently authenticated user's profile from MySQL.
 * Protected by authMiddleware.
 */
async function getMe(req, res) {
  try {
    // req.user.id is populated by authMiddleware from verified JWT
    const user = await authService.getUserById(req.user.id);

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    const status = err.code === 'USER_NOT_FOUND' ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to fetch user profile',
    });
  }
}

module.exports = { getMe };
