/**
 * controllers/disputeController.js
 * --------------------------------
 * Express handlers for raising, listing, inspecting, and resolving order disputes.
 */

const disputeService = require('../services/disputeService');

function errorToStatus(code) {
  const map = {
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    BAD_REQUEST: 400,
    DUPLICATE_DISPUTE: 400,
  };
  return map[code] || 500;
}

/**
 * POST /api/disputes
 * Raises a dispute for an order (buyer or seller).
 */
async function createDispute(req, res, next) {
  try {
    const { request_id, reason, description } = req.body;

    if (!request_id) {
      return res.status(400).json({
        success: false,
        message: 'request_id is required',
      });
    }

    const dispute = await disputeService.createDispute({
      requestId: request_id,
      userId: req.user.id,
      userRole: req.user.role,
      reason,
      description,
    });

    return res.status(201).json({
      success: true,
      message: 'Dispute submitted successfully and is under review',
      data: { dispute },
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
 * GET /api/disputes
 * Retrieves disputes (scoped by user role).
 */
async function getDisputes(req, res, next) {
  try {
    const { status, request_id, page, limit } = req.query;

    const result = await disputeService.getDisputes({
      userId: req.user.id,
      userRole: req.user.role,
      status,
      requestId: request_id,
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
 * GET /api/disputes/:id
 * Retrieves a single dispute with details.
 */
async function getDisputeById(req, res, next) {
  try {
    const dispute = await disputeService.getDisputeById(
      req.params.id,
      req.user.id,
      req.user.role
    );

    return res.status(200).json({
      success: true,
      data: { dispute },
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
 * PATCH /api/disputes/:id/status
 * Updates dispute status / resolves / rejects (Admin only).
 */
async function updateDisputeStatus(req, res, next) {
  try {
    const { status, admin_resolution, admin_notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const dispute = await disputeService.updateDisputeStatus(
      req.params.id,
      req.user.id,
      { status, admin_resolution, admin_notes }
    );

    return res.status(200).json({
      success: true,
      message: `Dispute updated to status: ${status}`,
      data: { dispute },
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
 * GET /api/disputes/:id/history
 * Retrieves dispute activity audit history.
 */
async function getDisputeHistory(req, res, next) {
  try {
    const history = await disputeService.getDisputeHistory(
      req.params.id,
      req.user.id,
      req.user.role
    );

    return res.status(200).json({
      success: true,
      data: { history },
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
 * PATCH /api/disputes/:id/resolve
 * Direct resolution endpoint with mandatory explanation check (Admin only).
 */
async function resolveDispute(req, res, next) {
  try {
    const { resolution, admin_resolution, admin_notes } = req.body;
    const finalResolution = (admin_resolution || resolution || '').trim();

    if (!finalResolution) {
      return res.status(400).json({
        success: false,
        message: 'Resolution explanation is required to resolve dispute',
      });
    }

    const dispute = await disputeService.updateDisputeStatus(
      req.params.id,
      req.user.id,
      {
        status: 'resolved',
        admin_resolution: finalResolution,
        admin_notes: admin_notes || 'Resolved by admin via direct resolution endpoint',
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Dispute successfully resolved',
      data: { dispute },
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
  createDispute,
  getDisputes,
  getDisputeById,
  updateDisputeStatus,
  resolveDispute,
  getDisputeHistory,
};
