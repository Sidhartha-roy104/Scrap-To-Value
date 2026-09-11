/**
 * controllers/authController.js
 * ------------------------------
 * HTTP request/response handlers for auth routes.
 * Delegates all business logic to authService.js.
 */

const { validationResult } = require('express-validator');
const authService = require('../services/authService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract validation errors from express-validator and return 422 */
function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return null;
}

/** Map service error codes to HTTP status codes */
function errorToStatus(code) {
  const map = {
    EMAIL_EXISTS: 409,
    INVALID_CREDENTIALS: 401,
    ACCOUNT_INACTIVE: 403,
    USER_NOT_FOUND: 404,
  };
  return map[code] || 500;
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
async function register(req, res) {
  const validationError = handleValidationErrors(req, res);
  if (validationError !== null) return;

  const { full_name, email, password, role } = req.body;

  try {
    const { user, token } = await authService.registerUser(
      full_name,
      email,
      password,
      role || 'buyer'
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, token },
    });
  } catch (err) {
    const status = errorToStatus(err.code);
    return res.status(status).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && status === 500 && { detail: err.message }),
    });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
async function login(req, res) {
  const validationError = handleValidationErrors(req, res);
  if (validationError !== null) return;

  const { email, password } = req.body;

  try {
    const { user, token } = await authService.loginUser(email, password);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user, token },
    });
  } catch (err) {
    const status = errorToStatus(err.code);
    return res.status(status).json({
      success: false,
      message: err.message,
    });
  }
}

// ---------------------------------------------------------------------------
// GET /api/auth/me  (requires authMiddleware)
// ---------------------------------------------------------------------------
async function me(req, res) {
  try {
    // req.user.id is populated by authMiddleware (verified from JWT)
    const user = await authService.getUserById(req.user.id);

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    const status = errorToStatus(err.code);
    return res.status(status).json({
      success: false,
      message: err.message,
    });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
// JWT logout is client-side: the frontend removes the token from storage.
// This endpoint exists for consistency and future token blacklisting.
function logout(_req, res) {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please remove your token from client storage.',
  });
}

module.exports = { register, login, me, logout };
