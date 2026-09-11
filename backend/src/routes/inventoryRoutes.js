/**
 * routes/inventoryRoutes.js
 * -------------------------
 * Routes for inventory status and transaction history.
 */

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const inventoryController = require('../controllers/inventoryController');

const router = express.Router();

// Public / Buyer check
router.get('/listings/:id', inventoryController.getListingInventory);

// Protected: Seller ledger history
router.get('/listings/:id/history', authMiddleware, inventoryController.getListingHistory);

module.exports = router;
