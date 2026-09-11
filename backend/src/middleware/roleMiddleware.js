/**
 * middleware/roleMiddleware.js
 * ----------------------------
 * Role-based authorization middleware factory.
 *
 * MUST be used AFTER authMiddleware — requires req.user to be set.
 *
 * Usage:
 *   router.delete('/listings/:id',
 *     authMiddleware,
 *     authorizeRoles('seller', 'admin'),
 *     controller
 *   );
 *
 * Returns 403 Forbidden if the user's role is not in the allowed list.
 */

/**
 * @param {...string} roles - One or more allowed role strings
 * @returns {Function} Express middleware
 */
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      // authMiddleware should always run first — this is a programming error
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: authMiddleware must precede roleMiddleware',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
}

module.exports = { authorizeRoles };
