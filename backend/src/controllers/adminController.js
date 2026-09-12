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

/**
 * GET /api/admin/sellers
 */
async function getSellers(req, res, next) {
  try {
    const { search, kycStatus, page, limit } = req.query;
    const data = await adminService.getAdminSellers({ search, kycStatus, page, limit });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/sellers/:id/verify
 */
async function updateSellerVerification(req, res, next) {
  try {
    const { kyc_verified, kyc_notes } = req.body;
    const updated = await adminService.updateSellerVerification(
      req.params.id,
      req.user.id,
      { kyc_verified, kyc_notes }
    );
    return res.status(200).json({
      success: true,
      message: `Seller verification status updated to ${kyc_verified ? 'VERIFIED' : 'UNVERIFIED'}`,
      data: { seller: updated },
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
 * GET /api/admin/buyers
 */
async function getBuyers(req, res, next) {
  try {
    const { search, isActive, page, limit } = req.query;
    const data = await adminService.getAdminBuyers({ search, isActive, page, limit });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/listings
 */
async function getListings(req, res, next) {
  try {
    const { search, sellerId, category, status, page, limit } = req.query;
    const data = await adminService.getAdminListings({ search, sellerId, category, status, page, limit });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/listings/:id/status
 */
async function updateListingStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }
    const listing = await adminService.updateListingStatus(req.params.id, { status });
    return res.status(200).json({
      success: true,
      message: `Listing status updated to ${status}`,
      data: { listing },
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
 * GET /api/admin/inventory
 */
async function getInventory(req, res, next) {
  try {
    const { search, material, page, limit } = req.query;
    const data = await adminService.getAdminInventory({ search, material, page, limit });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/inventory/transactions
 */
async function getInventoryTransactions(req, res, next) {
  try {
    const { listingId, type, page, limit } = req.query;
    const data = await adminService.getInventoryTransactions({ listingId, type, page, limit });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/payments
 */
async function getPayments(req, res, next) {
  try {
    const { search, status, page, limit } = req.query;
    const data = await adminService.getAdminPayments({ search, status, page, limit });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/fulfillment
 */
async function getFulfillment(req, res, next) {
  try {
    const { stage, delayedOnly, page, limit } = req.query;
    const data = await adminService.getAdminFulfillment({ stage, delayedOnly, page, limit });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/analytics
 */
async function getAnalytics(req, res, next) {
  try {
    const data = await adminService.getAdminAnalytics();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/activity-logs
 */
async function getActivityLogs(req, res, next) {
  try {
    const { page, limit } = req.query;
    const data = await adminService.getAdminActivityLogs({ page, limit });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/settings
 */
async function getSettings(req, res, next) {
  try {
    const data = await adminService.getSystemSettings();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/settings
 */
async function updateSettings(req, res, next) {
  try {
    const data = await adminService.updateSystemSettings(req.body);
    return res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      data,
    });
  } catch (err) {
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
  getSellers,
  updateSellerVerification,
  getBuyers,
  getListings,
  updateListingStatus,
  getInventory,
  getInventoryTransactions,
  getPayments,
  getFulfillment,
  getAnalytics,
  getActivityLogs,
  getSettings,
  updateSettings,
};
