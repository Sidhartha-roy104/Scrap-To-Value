/**
 * routes/reviewRoutes.js
 * ----------------------
 * Routes for Phase 9: Simple Reviews, Ratings & Trust System.
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Public endpoints
router.get('/seller/:sellerId', reviewController.getSellerReviews);
router.get('/user/:userId', reviewController.getUserReviews);

// Authenticated user endpoints
router.post('/', authMiddleware, reviewController.createReview);
router.get('/order/:requestId', authMiddleware, reviewController.getOrderReviews);
router.get('/my-reviews', authMiddleware, reviewController.getMyReviews);
router.patch('/:id', authMiddleware, reviewController.updateReview);
router.delete('/:id', authMiddleware, reviewController.deleteReview);

// Admin moderation endpoint
router.get(
  '/admin/all',
  authMiddleware,
  authorizeRoles('admin'),
  reviewController.adminListReviews
);

module.exports = router;
