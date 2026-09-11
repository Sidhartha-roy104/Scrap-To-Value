/**
 * routes/requestRoutes.js
 * -----------------------
 * Collection request routes for buyers and sellers in Rubbish Revamp.
 */

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requestController = require('../controllers/requestController');
const {
  createRequestRules,
  updateStatusRules,
} = require('../validators/requestValidator');

const router = express.Router();

// All request routes require authentication
router.use(authMiddleware);

// POST /api/requests — buyer creates request
router.post('/', createRequestRules, requestController.createRequest);

// GET /api/requests — get requests for authenticated user
router.get('/', requestController.getRequests);

// GET /api/requests/:id — get single request details
router.get('/:id', requestController.getRequestById);

// PATCH /api/requests/:id/status — update status
router.patch('/:id/status', updateStatusRules, requestController.updateRequestStatus);

module.exports = router;
