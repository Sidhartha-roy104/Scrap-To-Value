/**
 * routes/paymentRoutes.js
 * -----------------------
 * Express routes for payment operations and mock checkout simulation.
 */

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

// All payment operations require authentication
router.use(authMiddleware);

// Payment lifecycle
router.post('/', paymentController.createPayment);
router.get('/:id', paymentController.getPaymentById);
router.get('/order/:requestId', paymentController.getPaymentByRequestId);

// Mock checkout actions (development & testing)
router.post('/:id/mock-success', paymentController.processMockSuccess);
router.post('/:id/mock-failure', paymentController.processMockFailure);
router.post('/:id/cancel', paymentController.cancelPayment);
router.post('/:id/refund', paymentController.processMockRefund);

module.exports = router;
