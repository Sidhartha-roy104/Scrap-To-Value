/**
 * controllers/userController.js
 * ------------------------------
 * HTTP handlers for user profile and account operations.
 * Reads and updates user data in MySQL via authService / pool.
 *
 * Routes:
 *   GET   /api/users/me   → getMe    (retrieve own profile)
 *   PATCH /api/users/me   → updateMe (update own profile) — Phase 13
 */

const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { pool } = require('../config/db');

// ---------------------------------------------------------------------------
// ALLOWED update fields — never update id, email, password_hash, role, kyc_*
// ---------------------------------------------------------------------------
const UPDATABLE_FIELDS = [
  'display_name',
  'phone',
  'company_name',
  'company_address',
  'city',
  'state',
  'country',
  'company_type',
  'company_description',
];

/**
 * GET /api/users/me
 * Returns the currently authenticated user's profile from MySQL.
 * Protected by authMiddleware.
 */
async function getMe(req, res) {
  try {
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

/**
 * PATCH /api/users/me
 * Updates the currently authenticated user's profile in MySQL.
 * Protected by authMiddleware.
 * Only allows updating fields in UPDATABLE_FIELDS.
 * Never updates email, password_hash, role, kyc_verified, or id.
 */
async function updateMe(req, res) {
  // 1. Validate incoming fields
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  try {
    // 2. Build SET clause from allowed fields only
    const setClauses = [];
    const params = [];

    for (const field of UPDATABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        const val = req.body[field];
        // Allow null/empty string to clear a field
        setClauses.push(`${field} = ?`);
        params.push(val === '' ? null : val);
      }
    }

    if (setClauses.length === 0) {
      // Nothing to update — fetch and return current profile
      const user = await authService.getUserById(req.user.id);
      return res.status(200).json({
        success: true,
        message: 'No changes provided',
        data: { user },
      });
    }

    // 3. Execute the update
    params.push(req.user.id);
    const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`;
    await pool.execute(query, params);

    // 4. Fetch and return the updated user
    const updatedUser = await authService.getUserById(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  } catch (err) {
    console.error('[userController.updateMe] Error:', err.message);
    const status = err.code === 'USER_NOT_FOUND' ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to update profile',
    });
  }
}

module.exports = { getMe, updateMe };
