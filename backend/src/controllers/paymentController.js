/**
 * controllers/paymentController.js
 * --------------------------------
 * Express HTTP handlers for payment management and mock checkout simulations.
 */

const paymentService = require('../services/paymentService');

function errorToStatus(code) {
  const map = {
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    BAD_REQUEST: 400,
    INVALID_ORDER_STATE: 400,
    ALREADY_PAID: 409,
    INVENTORY_RESERVATION_INVALID: 400,
    PAYMENT_VERIFICATION_FAILED: 400,
  };
  return map[code] || 500;
}

/**
 * POST /api/payments
 * Initiates payment for an eligible order.
 */
async function createPayment(req, res, next) {
  try {
    const { request_id, payment_method } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] || null;

    const result = await paymentService.createPayment({
      requestId: request_id,
      buyerId: req.user.id,
      paymentMethod: payment_method || 'mock_upi',
      idempotencyKey,
    });

    const statusCode = result.reused ? 200 : 201;
    return res.status(statusCode).json({
      success: true,
      message: result.reused
        ? 'Active pending payment retrieved'
        : 'Payment order created successfully',
      data: result,
    });
  } catch (err) {
    const status = errorToStatus(err.code);
    if (status < 500) {
      return res.status(status).json({
        success: false,
        message: err.message,
        payment: err.payment || undefined,
      });
    }
    next(err);
  }
}

/**
 * POST /api/payments/:id/mock-success
 * Simulates a successful mock checkout.
 */
async function processMockSuccess(req, res, next) {
  try {
    const { id } = req.params;
    const { mock_payment_id } = req.body;

    const result = await paymentService.processMockSuccess({
      paymentId: id,
      buyerId: req.user.id,
      mockPaymentId: mock_payment_id,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
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
 * POST /api/payments/:id/mock-failure
 * Simulates a failed mock checkout.
 */
async function processMockFailure(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await paymentService.processMockFailure({
      paymentId: id,
      buyerId: req.user.id,
      reason: reason || 'Payment simulation failed by user',
    });

    return res.status(200).json({
      success: false,
      message: result.message,
      data: result,
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
 * POST /api/payments/:id/cancel
 * Cancels a pending checkout.
 */
async function cancelPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await paymentService.cancelPayment({
      paymentId: id,
      buyerId: req.user.id,
      reason: reason || 'User cancelled checkout',
    });

    return res.status(200).json({
      success: true,
      message: 'Payment checkout cancelled',
      data: result,
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
 * GET /api/payments/:id
 * Retrieves payment details.
 */
async function getPaymentById(req, res, next) {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentById(id, req.user.id, req.user.role);

    return res.status(200).json({
      success: true,
      data: { payment },
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
 * GET /api/payments/order/:requestId
 * Retrieves payment status for an order.
 */
async function getPaymentByRequestId(req, res, next) {
  try {
    const { requestId } = req.params;
    const payment = await paymentService.getPaymentByRequestId(requestId, req.user.id, req.user.role);

    return res.status(200).json({
      success: true,
      data: { payment },
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
 * POST /api/payments/:id/refund
 * Simulates refunding a completed payment.
 */
async function processMockRefund(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await paymentService.processMockRefund({
      paymentId: id,
      userId: req.user.id,
      reason,
    });

    return res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: result,
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
  createPayment,
  processMockSuccess,
  processMockFailure,
  cancelPayment,
  getPaymentById,
  getPaymentByRequestId,
  processMockRefund,
};
