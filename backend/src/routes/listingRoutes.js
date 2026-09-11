/**
 * routes/listingRoutes.js
 * -----------------------
 * Waste listing routes for Rubbish Revamp backend API.
 */

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const listingController = require('../controllers/listingController');
const { upload } = require('../utils/upload');
const {
  createListingRules,
  updateListingRules,
} = require('../validators/listingValidator');

const router = express.Router();

/**
 * Middleware wrapper for multer upload to catch and format file upload errors.
 */
function handleUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Image size exceeds maximum 5MB limit',
        });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading file',
      });
    }
    next();
  });
}

// Public / Buyer routes
router.get('/', listingController.getListings);
router.get('/:id', listingController.getListingById);

// Protected routes (require authenticated user via Bearer JWT)
router.post('/', authMiddleware, handleUpload, createListingRules, listingController.createListing);
router.patch('/:id', authMiddleware, handleUpload, updateListingRules, listingController.updateListing);
router.delete('/:id', authMiddleware, listingController.deleteListing);
router.post('/upload-image', authMiddleware, handleUpload, listingController.uploadImage);

module.exports = router;
