/**
 * controllers/requestController.js
 * --------------------------------
 * Express HTTP handlers for collection requests (scrap requests).
 */

const { validationResult } = require('express-validator');
const requestService = require('../services/requestService');

/** Map error codes to HTTP statuses */
function errorToStatus(code) {
  const map = {
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    BAD_REQUEST: 400,
    INVALID_QUANTITY: 400,
    QUANTITY_EXCEEDED: 400,
  };
  return map[code] || 500;
}

/**
 * POST /api/requests
 * Creates a new collection request for a scrap listing.
 * Authenticated buyer only.
 */
async function createRequest(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { listing_id, requested_quantity, buyer_message } = req.body;

    const request = await requestService.createRequest({
      buyerId: req.user.id,
      userRole: req.user.role,
      listing_id,
      requested_quantity,
      buyer_message,
    });

    return res.status(201).json({
      success: true,
      message: 'Scrap request submitted successfully',
      data: { request },
    });
  } catch (err) {
    const status = errorToStatus(err.code);
    if (status < 500) {
      return res.status(status).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * GET /api/requests
 * Retrieves collection requests for the authenticated user.
 */
async function getRequests(req, res, next) {
  try {
    const { status, page, limit } = req.query;

    const result = await requestService.getRequests({
      userId: req.user.id,
      userRole: req.user.role,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
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
 * GET /api/requests/:id
 * Retrieves a single collection request by ID.
 */
async function getRequestById(req, res, next) {
  try {
    const request = await requestService.getRequestById(req.params.id);

    // Verify user is either the buyer or the seller
    if (request.buyer_id !== req.user.id && request.seller_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this request.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { request },
    });
  } catch (err) {
    const status = errorToStatus(err.code);
    if (status < 500) {
      return res.status(status).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * PATCH /api/requests/:id/status
 * Updates status of a request (confirmed, in_transit, delivered, cancelled, etc.).
 */
async function updateRequestStatus(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { status, note, estimated_delivery } = req.body;

    const request = await requestService.updateRequestStatus(
      req.params.id,
      req.user.id,
      { status, note, estimated_delivery }
    );

    return res.status(200).json({
      success: true,
      message: `Request status updated to ${status}`,
      data: { request },
    });
  } catch (err) {
    const status = errorToStatus(err.code);
    if (status < 500) {
      return res.status(status).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
};
