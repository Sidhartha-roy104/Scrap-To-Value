/**
 * utils/jwt.js
 * -------------
 * JWT sign and verify helpers for Rubbish Revamp authentication.
 * All JWT operations go through this module — never call jsonwebtoken directly.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET is not set in environment variables. Refusing to start.');
  process.exit(1);
}

/**
 * Sign a JWT token containing user claims.
 * @param {Object} payload - Must include id, email, role
 * @returns {string} Signed JWT string
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token.
 * @param {string} token
 * @returns {Object} Decoded payload
 * @throws {JsonWebTokenError | TokenExpiredError}
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };
