/**
 * controllers/adminController.js
 * -------------------------------
 * HTTP handlers for Admin operations (metrics, orders, user directory).
 */

const adminService = require('../services/adminService');

function errorToStatus(code) {
  const map = {
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    BAD_REQUEST: 400,
  };
  return map[code] || 500;
}

/**
 * GET /api/admin/stats
 */
async function getStats(req, res, next) {
  try {
    const stats = await adminService.getAdminStats();
    return res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/orders
 */
async function getOrders(req, res, next) {
  try {
    const { search, status, dateFrom, dateTo, buyerId, sellerId, page, limit } = req.query;
    const result = await adminService.getAdminOrders({
      search,
      status,
      dateFrom,
      dateTo,
      buyerId,
      sellerId,
      page,
      limit,
    });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/orders/:id
 */
async function getOrderById(req, res, next) {
  try {
    const order = await adminService.getAdminOrderById(req.params.id);
    return res.status(200).json({
      success: true,
      data: { order },
    });
  } catch (err) {
    const status = errorToStatus(err.code);
    if (status < 500) {
      return res.status(status).json({ success: false, message: err.message });
    }
    next(err);
  }
}

/**
 * GET /api/admin/users
 */
async function getUsers(req, res, next) {
  try {
    const { search, role, status, page, limit } = req.query;
    const result = await adminService.getAdminUsers({
      search,
      role,
      status,
      page,
      limit,
    });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/users/:id
 */
async function getUserById(req, res, next) {
  try {
    const user = await adminService.getAdminUserById(req.params.id);
    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    const status = errorToStatus(err.code);
    if (status < 500) {
      return res.status(status).json({ success: false, message: err.message });
    }
    next(err);
  }
}

/**
 * PATCH /api/admin/users/:id/status
 */
async function updateUserStatus(req, res, next) {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_active must be a boolean (true or false)',
      });
    }

    const updatedUser = await adminService.updateUserStatus(
      req.params.id,
      req.user.id,
      { is_active }
    );

    return res.status(200).json({
      success: true,
      message: `User account has been ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: { user: updatedUser },
    });
  } catch (err) {
    const status = errorToStatus(err.code);
    if (status < 500) {
      return res.status(status).json({ success: false, message: err.message });
    }
    next(err);
  }
}

module.exports = {
  getStats,
  getOrders,
  getOrderById,
  getUsers,
  getUserById,
  updateUserStatus,
};
