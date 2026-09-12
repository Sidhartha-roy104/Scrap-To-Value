/**
 * routes/adminRoutes.js
 * ---------------------
 * Admin-only management endpoints.
 * Strictly protected by authMiddleware and authorizeRoles('admin').
 */

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Enforce admin-only access on all /api/admin routes
router.use(authMiddleware);
router.use(authorizeRoles('admin'));

// GET /api/admin/stats — Dashboard platform aggregates
router.get('/stats', adminController.getStats);

// GET /api/admin/orders — Platform-wide collection requests & orders
router.get('/orders', adminController.getOrders);

// GET /api/admin/orders/:id — Single order inspection details
router.get('/orders/:id', adminController.getOrderById);

// GET /api/admin/users — User directory
router.get('/users', adminController.getUsers);

// GET /api/admin/users/:id — Single user profile details
router.get('/users/:id', adminController.getUserById);

// PATCH /api/admin/users/:id/status — Soft activate/deactivate user
router.patch('/users/:id/status', adminController.updateUserStatus);

// PATCH /api/admin/users/:userId/verification — Verify / unverify supplier user
router.patch('/users/:userId/verification', adminController.updateUserVerification);

// Sellers & Verification
router.get('/sellers', adminController.getSellers);
router.patch('/sellers/:id/verify', adminController.updateSellerVerification);

// Buyers
router.get('/buyers', adminController.getBuyers);

// Listings
router.get('/listings', adminController.getListings);
router.patch('/listings/:id/status', adminController.updateListingStatus);

// Inventory & Ledger
router.get('/inventory', adminController.getInventory);
router.get('/inventory/transactions', adminController.getInventoryTransactions);

// Payments
router.get('/payments', adminController.getPayments);

// Fulfillment
router.get('/fulfillment', adminController.getFulfillment);

// Platform Analytics
router.get('/analytics', adminController.getAnalytics);

// Activity Logs
router.get('/activity-logs', adminController.getActivityLogs);

// System Settings
router.get('/settings', adminController.getSettings);
router.patch('/settings', adminController.updateSettings);

module.exports = router;
