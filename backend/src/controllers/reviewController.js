/**
 * controllers/reviewController.js
 * --------------------------------
 * Controller for Phase 9: Simple Reviews, Ratings & Trust System.
 */

const reviewService = require('../services/reviewService');

/**
 * POST /api/reviews
 * Create a review for a delivered order
 */
async function createReview(req, res, next) {
  try {
    const { requestId, rating, comment } = req.body;
    const reviewerId = req.user.id;

    const review = await reviewService.createReview({
      requestId,
      reviewerId,
      rating,
      comment,
    });

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      data: review,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reviews/seller/:sellerId
 * Get public seller rating and buyer-authored reviews
 */
async function getSellerReviews(req, res, next) {
  try {
    const { sellerId } = req.params;
    const { page, limit, rating } = req.query;

    const result = await reviewService.getSellerReviews(sellerId, { page, limit, rating });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reviews/user/:userId
 * Get user reviews and rating summary
 */
async function getUserReviews(req, res, next) {
  try {
    const { userId } = req.params;
    const { page, limit, rating, role } = req.query;

    const result = await reviewService.getUserReviews(userId, { page, limit, rating, role });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reviews/order/:requestId
 * Get reviews and eligibility state for a specific order
 */
async function getOrderReviews(req, res, next) {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user?.id || null;

    const result = await reviewService.getOrderReviews(requestId, currentUserId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reviews/my-reviews
 * Get all reviews authored by the authenticated user
 */
async function getMyReviews(req, res, next) {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;

    const result = await reviewService.getMyReviews(userId, { page, limit });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/reviews/:id
 * Update an existing review (owner only)
 */
async function updateReview(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating, comment } = req.body;

    const updated = await reviewService.updateReview(id, userId, { rating, comment });

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/reviews/:id
 * Delete or soft-hide a review (owner or admin)
 */
async function deleteReview(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await reviewService.deleteReview(id, userId, userRole);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reviews/admin/all
 * Admin review moderation list
 */
async function adminListReviews(req, res, next) {
  try {
    const { status, page, limit } = req.query;
    const result = await reviewService.adminListReviews({ status, page, limit });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createReview,
  getUserReviews,
  getSellerReviews,
  getOrderReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  adminListReviews,
};
