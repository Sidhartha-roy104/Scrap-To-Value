/**
 * controllers/inventoryController.js
 * ----------------------------------
 * HTTP handlers for inventory status, checks, and ledger history.
 */

const inventoryService = require('../services/inventoryService');
const { pool } = require('../config/db');

/**
 * GET /api/inventory/listings/:id
 * Returns current inventory breakdown for a listing: total, available, reserved, fulfilled.
 */
async function getListingInventory(req, res, next) {
  try {
    const { id } = req.params;
    const inventory = await inventoryService.getListingInventory(id);

    return res.status(200).json({
      success: true,
      data: { inventory },
    });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * GET /api/inventory/listings/:id/history
 * Returns inventory ledger history for a listing.
 * Authenticated; only listing owner can view full history.
 */
async function getListingHistory(req, res, next) {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    // Check ownership
    const [listingRows] = await pool.execute(
      'SELECT user_id FROM waste_listings WHERE id = ? LIMIT 1',
      [id]
    );

    if (listingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.',
      });
    }

    if (listingRows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the seller who owns this listing can view its inventory ledger.',
      });
    }

    const history = await inventoryService.getInventoryHistory(id, limit);

    return res.status(200).json({
      success: true,
      data: { history },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getListingInventory,
  getListingHistory,
};
