/**
 * services/reviewService.js
 * -------------------------
 * Service for Phase 9: Reviews, Ratings & Trust System.
 *
 * Rules:
 * - Reviews only allowed after request reaches status 'delivered'.
 * - Only buyer and seller directly involved in the order can review each other.
 * - One review per party per delivered order.
 * - Rating required: integer 1..5.
 * - Comment optional, max 500 chars.
 * - Prevents self-reviews and duplicate reviews.
 * - Sends notification to reviewee upon review creation.
 */

const crypto = require('crypto');
const { pool } = require('../config/db');
const notificationService = require('./notificationService');

/**
 * Custom error helper with HTTP status
 */
function createError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Validate and create a new review for a delivered order
 */
async function createReview({ requestId, reviewerId, rating, comment }) {
  // 1. Validate rating
  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    throw createError('Rating is required and must be an integer between 1 and 5.', 400);
  }

  // 2. Validate comment
  let cleanComment = null;
  if (comment !== undefined && comment !== null) {
    cleanComment = String(comment).trim();
    if (cleanComment.length > 500) {
      throw createError('Review comment cannot exceed 500 characters.', 400);
    }
    if (cleanComment.length === 0) {
      cleanComment = null;
    }
  }

  if (!requestId) {
    throw createError('Order request ID is required.', 400);
  }

  const connection = await pool.getConnection();

  try {
    // 3. Fetch order / collection request
    const [orders] = await connection.execute(
      `SELECT cr.id, cr.buyer_id, cr.seller_id, cr.status, cr.amount,
              COALESCE(bu.display_name, bu.email) AS buyer_name,
              COALESCE(su.display_name, su.email) AS seller_name
       FROM collection_requests cr
       LEFT JOIN users bu ON cr.buyer_id = bu.id
       LEFT JOIN users su ON cr.seller_id = su.id
       WHERE cr.id = ?`,
      [requestId]
    );

    if (orders.length === 0) {
      throw createError('Order not found.', 404);
    }

    const order = orders[0];

    // 4. Enforce order lifecycle status
    if (order.status !== 'delivered') {
      throw createError(
        `Reviews are only permitted for delivered orders. Current order status: "${order.status}".`,
        400
      );
    }

    // 5. Enforce buyer-only review policy: only buyers can review sellers
    const isBuyer = order.buyer_id === reviewerId;
    const isSeller = order.seller_id === reviewerId;

    if (isSeller) {
      throw createError('Sellers cannot review buyers. Only buyers can review sellers after order delivery.', 403);
    }

    if (!isBuyer) {
      throw createError('You are not authorized to review this order as you are not the buyer.', 403);
    }

    // 6. Prevent self-review
    if (order.buyer_id === order.seller_id) {
      throw createError('Users cannot review themselves.', 400);
    }

    const reviewerRole = 'buyer';
    const revieweeId = order.seller_id;
    const reviewerName = order.buyer_name;

    // 7. Check for duplicate review
    const [existing] = await connection.execute(
      `SELECT id FROM reviews WHERE request_id = ? AND reviewer_id = ?`,
      [requestId, reviewerId]
    );

    if (existing.length > 0) {
      throw createError('You have already submitted a review for this order.', 400);
    }

    // 8. Insert review record
    const reviewId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO reviews (
        id, request_id, reviewer_id, reviewee_id, reviewer_role, rating, comment, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'visible')`,
      [reviewId, requestId, reviewerId, revieweeId, reviewerRole, numericRating, cleanComment]
    );

    // Fetch inserted record
    const [createdRows] = await connection.execute(
      `SELECT r.*,
              COALESCE(u.display_name, u.email) AS reviewer_name,
              u.company_name AS reviewer_company,
              u.avatar_url AS reviewer_avatar,
              COALESCE(ru.display_name, ru.email) AS reviewee_name
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       JOIN users ru ON r.reviewee_id = ru.id
       WHERE r.id = ?`,
      [reviewId]
    );

    const review = createdRows[0];

    // 9. Dispatch notification to reviewee asynchronously
    try {
      await notificationService.createNotification({
        recipientId: revieweeId,
        type: notificationService.NotificationTypes.REVIEW_RECEIVED || 'REVIEW_RECEIVED',
        title: 'New Review Received',
        message: `${reviewerName || 'A counterparty'} left you a ${numericRating}-star review for order #${requestId.slice(0, 8)}.`,
        relatedRequestId: requestId,
        link: '/orders',
      });
    } catch (notifErr) {
      console.warn('[ReviewService] Could not send review notification:', notifErr.message);
    }

    return review;
  } finally {
    connection.release();
  }
}

/**
 * Calculate public seller rating summary strictly from buyer reviews.
 * Criteria: reviewee_id = seller_id AND reviewer_role = 'buyer' AND status = 'visible'.
 */
async function getSellerRatingSummary(sellerId) {
  const [rows] = await pool.execute(
    `SELECT 
        COUNT(*) AS total_reviews,
        COALESCE(AVG(rating), 0) AS avg_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS count_5,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS count_4,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS count_3,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS count_2,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS count_1
     FROM reviews
     WHERE reviewee_id = ? AND reviewer_role = 'buyer' AND status = 'visible'`,
    [sellerId]
  );

  const stats = rows[0] || {};
  const total = Number(stats.total_reviews) || 0;
  const rawAvg = Number(stats.avg_rating) || 0;
  const averageRating = total > 0 ? Number(rawAvg.toFixed(1)) : 0;

  return {
    averageRating,
    reviewCount: total,
    distribution: {
      5: Number(stats.count_5) || 0,
      4: Number(stats.count_4) || 0,
      3: Number(stats.count_3) || 0,
      2: Number(stats.count_2) || 0,
      1: Number(stats.count_1) || 0,
    },
  };
}

/**
 * Calculate internal buyer reputation summary strictly from seller reviews.
 * Criteria: reviewee_id = buyer_id AND reviewer_role = 'seller' AND status = 'visible'.
 */
async function getBuyerRatingSummary(buyerId) {
  const [rows] = await pool.execute(
    `SELECT 
        COUNT(*) AS total_reviews,
        COALESCE(AVG(rating), 0) AS avg_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS count_5,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS count_4,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS count_3,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS count_2,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS count_1
     FROM reviews
     WHERE reviewee_id = ? AND reviewer_role = 'seller' AND status = 'visible'`,
    [buyerId]
  );

  const stats = rows[0] || {};
  const total = Number(stats.total_reviews) || 0;
  const rawAvg = Number(stats.avg_rating) || 0;
  const averageRating = total > 0 ? Number(rawAvg.toFixed(1)) : 0;

  return {
    averageRating,
    reviewCount: total,
    distribution: {
      5: Number(stats.count_5) || 0,
      4: Number(stats.count_4) || 0,
      3: Number(stats.count_3) || 0,
      2: Number(stats.count_2) || 0,
      1: Number(stats.count_1) || 0,
    },
  };
}

/**
 * Calculate rating summary for a user based on their marketplace role.
 * Sellers: Buyer-to-seller reviews only.
 * Buyers: Seller-to-buyer reviews only.
 */
async function getUserRatingSummary(userId, { role = null } = {}) {
  let targetRole = role;

  if (!targetRole) {
    const [users] = await pool.execute('SELECT role FROM users WHERE id = ?', [userId]);
    targetRole = users[0]?.role || 'seller';
  }

  if (targetRole === 'buyer') {
    return getBuyerRatingSummary(userId);
  }

  // Default to seller rating
  return getSellerRatingSummary(userId);
}

/**
 * Dedicated helper to retrieve seller reviews and public marketplace rating.
 */
async function getSellerReviews(sellerId, { page = 1, limit = 10, rating = null } = {}) {
  const result = await getUserReviews(sellerId, { page, limit, rating, role: 'seller' });
  return {
    sellerId,
    averageRating: result.summary.averageRating,
    reviewCount: result.summary.reviewCount,
    summary: result.summary,
    reviews: result.reviews,
    pagination: result.pagination,
  };
}

/**
 * Get visible reviews for a user (as reviewee) with pagination and reviewer details.
 * When role='seller' (or user is seller), strictly filters for buyer-authored reviews.
 */
async function getUserReviews(userId, { page = 1, limit = 10, rating = null, role = null } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  let targetRole = role;
  if (!targetRole) {
    const [users] = await pool.execute('SELECT role FROM users WHERE id = ?', [userId]);
    targetRole = users[0]?.role || 'seller';
  }

  const queryParams = [userId];
  let filterClause = "WHERE r.reviewee_id = ? AND r.status = 'visible'";

  // Enforce correct review direction:
  // Public seller feedback must come from buyers only
  if (targetRole === 'seller') {
    filterClause += " AND r.reviewer_role = 'buyer'";
  } else if (targetRole === 'buyer') {
    filterClause += " AND r.reviewer_role = 'seller'";
  }

  if (rating) {
    const num = Number(rating);
    if (num >= 1 && num <= 5) {
      filterClause += ' AND r.rating = ?';
      queryParams.push(num);
    }
  }

  // Count matching reviews
  const [countResult] = await pool.execute(
    `SELECT COUNT(*) AS total FROM reviews r ${filterClause}`,
    queryParams
  );
  const total = countResult[0]?.total || 0;

  // Fetch paginated reviews
  const listParams = [...queryParams, limitNum, offset];
  const [reviews] = await pool.query(
    `SELECT r.*,
            COALESCE(u.display_name, u.email) AS reviewer_name,
            u.company_name AS reviewer_company,
            u.avatar_url AS reviewer_avatar,
            cr.amount AS order_amount,
            cr.waste_type AS order_waste_type
     FROM reviews r
     JOIN users u ON r.reviewer_id = u.id
     LEFT JOIN collection_requests cr ON r.request_id = cr.id
     ${filterClause}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    listParams
  );

  const summary = await getUserRatingSummary(userId, { role: targetRole });

  return {
    summary,
    reviews,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Get reviews and review eligibility for an order
 */
async function getOrderReviews(requestId, currentUserId = null) {
  const [orders] = await pool.execute(
    `SELECT cr.id, cr.buyer_id, cr.seller_id, cr.status,
            COALESCE(bu.display_name, bu.email) AS buyer_name, bu.company_name AS buyer_company,
            COALESCE(su.display_name, su.email) AS seller_name, su.company_name AS seller_company
     FROM collection_requests cr
     LEFT JOIN users bu ON cr.buyer_id = bu.id
     LEFT JOIN users su ON cr.seller_id = su.id
     WHERE cr.id = ?`,
    [requestId]
  );

  if (orders.length === 0) {
    throw createError('Order not found.', 404);
  }

  const order = orders[0];

  const [reviews] = await pool.execute(
    `SELECT r.*,
            COALESCE(u.display_name, u.email) AS reviewer_name,
            u.company_name AS reviewer_company,
            u.avatar_url AS reviewer_avatar
     FROM reviews r
     JOIN users u ON r.reviewer_id = u.id
     WHERE r.request_id = ? AND r.status = 'visible'
     ORDER BY r.created_at ASC`,
    [requestId]
  );

  let canReview = false;
  let myReview = null;
  let eligibleRole = null;
  let counterparty = null;

  if (currentUserId) {
    const isBuyer = order.buyer_id === currentUserId;

    if (isBuyer) {
      eligibleRole = 'buyer';
      counterparty = {
        id: order.seller_id,
        name: order.seller_name,
        company: order.seller_company,
        role: 'seller',
      };

      myReview = reviews.find((r) => r.reviewer_id === currentUserId) || null;
      canReview = order.status === 'delivered' && !myReview && order.buyer_id !== order.seller_id;
    }
  }

  return {
    requestId,
    orderStatus: order.status,
    reviews,
    canReview,
    myReview,
    eligibleRole,
    counterparty,
  };
}

/**
 * Get all reviews authored by the current user
 */
async function getMyReviews(userId, { page = 1, limit = 10 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const [countResult] = await pool.execute(
    `SELECT COUNT(*) AS total FROM reviews WHERE reviewer_id = ?`,
    [userId]
  );
  const total = countResult[0]?.total || 0;

  const [reviews] = await pool.query(
    `SELECT r.*,
            COALESCE(ru.display_name, ru.email) AS reviewee_name,
            ru.company_name AS reviewee_company,
            ru.avatar_url AS reviewee_avatar,
            cr.amount AS order_amount,
            cr.waste_type AS order_waste_type,
            cr.status AS order_status
     FROM reviews r
     JOIN users ru ON r.reviewee_id = ru.id
     LEFT JOIN collection_requests cr ON r.request_id = cr.id
     WHERE r.reviewer_id = ?
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limitNum, offset]
  );

  return {
    reviews,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Update an existing review (rating or comment)
 */
async function updateReview(reviewId, userId, { rating, comment }) {
  const [existing] = await pool.execute(
    `SELECT * FROM reviews WHERE id = ?`,
    [reviewId]
  );

  if (existing.length === 0) {
    throw createError('Review not found.', 404);
  }

  const review = existing[0];
  if (review.reviewer_id !== userId) {
    throw createError('You are only authorized to edit your own reviews.', 403);
  }

  let newRating = review.rating;
  if (rating !== undefined) {
    const num = Number(rating);
    if (!Number.isInteger(num) || num < 1 || num > 5) {
      throw createError('Rating must be an integer between 1 and 5.', 400);
    }
    newRating = num;
  }

  let newComment = review.comment;
  if (comment !== undefined) {
    if (comment === null || String(comment).trim() === '') {
      newComment = null;
    } else {
      const trimmed = String(comment).trim();
      if (trimmed.length > 500) {
        throw createError('Review comment cannot exceed 500 characters.', 400);
      }
      newComment = trimmed;
    }
  }

  await pool.execute(
    `UPDATE reviews SET rating = ?, comment = ?, updated_at = NOW() WHERE id = ?`,
    [newRating, newComment, reviewId]
  );

  const [updated] = await pool.execute(
    `SELECT r.*,
            COALESCE(u.display_name, u.email) AS reviewer_name,
            COALESCE(ru.display_name, ru.email) AS reviewee_name
     FROM reviews r
     JOIN users u ON r.reviewer_id = u.id
     JOIN users ru ON r.reviewee_id = ru.id
     WHERE r.id = ?`,
    [reviewId]
  );

  return updated[0];
}

/**
 * Delete or soft-hide a review (by author or admin)
 */
async function deleteReview(reviewId, userId, userRole) {
  const [existing] = await pool.execute(
    `SELECT * FROM reviews WHERE id = ?`,
    [reviewId]
  );

  if (existing.length === 0) {
    throw createError('Review not found.', 404);
  }

  const review = existing[0];
  const isOwner = review.reviewer_id === userId;
  const isAdmin = userRole === 'admin';

  if (!isOwner && !isAdmin) {
    throw createError('You are not authorized to delete this review.', 403);
  }

  // Soft-hide or delete
  await pool.execute(
    `UPDATE reviews SET status = 'hidden', updated_at = NOW() WHERE id = ?`,
    [reviewId]
  );

  return { message: 'Review hidden successfully.', reviewId };
}

/**
 * Admin: list reviews with optional filter for moderation
 */
async function adminListReviews({ status, page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const queryParams = [];
  let filterClause = '';
  if (status) {
    filterClause = 'WHERE r.status = ?';
    queryParams.push(status);
  }

  const [countResult] = await pool.execute(
    `SELECT COUNT(*) AS total FROM reviews r ${filterClause}`,
    queryParams
  );
  const total = countResult[0]?.total || 0;

  const listParams = [...queryParams, limitNum, offset];
  const [reviews] = await pool.query(
    `SELECT r.*,
            COALESCE(u.display_name, u.email) AS reviewer_name, u.email AS reviewer_email,
            COALESCE(ru.display_name, ru.email) AS reviewee_name, ru.email AS reviewee_email,
            cr.amount AS order_amount, cr.status AS order_status
     FROM reviews r
     JOIN users u ON r.reviewer_id = u.id
     JOIN users ru ON r.reviewee_id = ru.id
     LEFT JOIN collection_requests cr ON r.request_id = cr.id
     ${filterClause}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    listParams
  );

  return {
    reviews,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

module.exports = {
  createReview,
  getUserRatingSummary,
  getSellerRatingSummary,
  getBuyerRatingSummary,
  getSellerReviews,
  getUserReviews,
  getOrderReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  adminListReviews,
};
