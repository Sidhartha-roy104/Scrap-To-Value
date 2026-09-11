/**
 * middleware/authMiddleware.js
 * ----------------------------
 * JWT authentication middleware for protected routes.
 *
 * Usage:
 *   router.get('/protected', authMiddleware, controller);
 *
 * On success: attaches req.user = { id, email, role }
 * On failure: returns 401 Unauthorized
 */

const { verifyToken } = require('../utils/jwt');

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header missing',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header must use Bearer scheme',
      });
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token is missing',
      });
    }

    const decoded = verifyToken(token);

    // Only attach safe, server-verified claims
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
    // Unknown error — don't expose details
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
}

module.exports = authMiddleware;
