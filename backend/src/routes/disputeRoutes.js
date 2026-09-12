/**
 * routes/disputeRoutes.js
 * -----------------------
 * Dispute management routes.
 * Creation and inspection accessible to authenticated parties; resolution restricted to Admins.
 */

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const disputeController = require('../controllers/disputeController');

const router = express.Router();

router.use(authMiddleware);

// POST /api/disputes — buyer or seller raises dispute
router.post('/', disputeController.createDispute);

// GET /api/disputes — list disputes (scoped by role)
router.get('/', disputeController.getDisputes);

// GET /api/disputes/:id — view single dispute details
router.get('/:id', disputeController.getDisputeById);

// GET /api/disputes/:id/history — view dispute activity history
router.get('/:id/history', disputeController.getDisputeHistory);

// PATCH /api/disputes/:id/resolve — Admin direct resolution endpoint
router.patch('/:id/resolve', authorizeRoles('admin'), disputeController.resolveDispute);

// PATCH /api/disputes/:id/status — Admin status update / resolution
router.patch('/:id/status', authorizeRoles('admin'), disputeController.updateDisputeStatus);

module.exports = router;
