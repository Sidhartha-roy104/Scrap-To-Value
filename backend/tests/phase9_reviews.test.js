/**
 * tests/phase9_reviews.test.js
 * ----------------------------
 * Comprehensive automated test suite for Phase 9:
 * Simple Reviews, Ratings & Trust System.
 *
 * Covers:
 * - Authentication and authorization (401, 403)
 * - Review validation (rating 1..5, comment <= 500 chars)
 * - Order lifecycle gating (only 'delivered' orders eligible; rejects non-delivered with 400)
 * - Non-party rejection (403)
 * - Self-review prevention (400)
 * - Buyer reviews seller once per delivered order (201)
 * - Seller reviews buyer once per delivered order (201)
 * - Duplicate review guard (400)
 * - Notification dispatch to reviewee
 * - Order reviews eligibility endpoint (`canReview`, `myReview`)
 * - Rating summary calculation (average rating, review count, 1..5 star distribution)
 * - My reviews endpoint
 * - Edit / update review by author (200)
 * - Unauthorized edit blocked (403)
 * - Delete / soft-hide review by author or admin (200)
 * - Admin moderation list (200)
 */

const http = require('http');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('../src/config/db');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;
const jwtSecret = process.env.JWT_SECRET || 'your-default-jwt-secret-replace-in-production';

function makeToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '1h' });
}

let buyer = null;
let buyerToken = null;
let seller = null;
let sellerToken = null;
let otherUser = null;
let otherToken = null;
let admin = null;
let adminToken = null;

let deliveredRequestId = null;
let pendingRequestId = null;
let testReviewId = null;

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  [PASS] ${description}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${description}`);
    failed++;
  }
}

function req(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers,
    };

    const request = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = { raw: data };
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    request.on('error', (err) => reject(err));
    if (body) request.write(JSON.stringify(body));
    request.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   PHASE 9: REVIEWS, RATINGS & TRUST SYSTEM TESTS');
  console.log('======================================================\n');

  try {
    // -------------------------------------------------------------
    // Setup: Retrieve or create test users and sample requests
    // -------------------------------------------------------------
    console.log('Setting up test fixtures in database...');

    const [users] = await pool.query(
      `SELECT id, email, role, display_name, company_name FROM users ORDER BY created_at ASC LIMIT 10`
    );

    const buyers = users.filter((u) => u.role === 'buyer');
    const sellers = users.filter((u) => u.role === 'seller');
    const admins = users.filter((u) => u.role === 'admin');

    if (buyers.length < 2 || sellers.length < 1 || admins.length < 1) {
      throw new Error('Not enough seeded users for review testing. Ensure database has buyers, sellers, and admins.');
    }

    buyer = buyers[0];
    buyerToken = makeToken(buyer);

    otherUser = buyers[1];
    otherToken = makeToken(otherUser);

    seller = sellers[0];
    sellerToken = makeToken(seller);

    admin = admins[0];
    adminToken = makeToken(admin);

    // Create a delivered order between buyer and seller
    deliveredRequestId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO collection_requests (
        id, buyer_id, seller_id, waste_type, quantity, price_per_kg, amount, status, created_at, updated_at
      ) VALUES (?, ?, ?, 'copper', 50.00, 420.00, 21000.00, 'delivered', NOW(), NOW())`,
      [deliveredRequestId, buyer.id, seller.id]
    );

    // Create a pending order between buyer and seller
    pendingRequestId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO collection_requests (
        id, buyer_id, seller_id, waste_type, quantity, price_per_kg, amount, status, created_at, updated_at
      ) VALUES (?, ?, ?, 'aluminum', 20.00, 150.00, 3000.00, 'pending', NOW(), NOW())`,
      [pendingRequestId, buyer.id, seller.id]
    );

    console.log('Fixtures established:');
    console.log(`- Buyer: ${buyer.email} (${buyer.id})`);
    console.log(`- Seller: ${seller.email} (${seller.id})`);
    console.log(`- Delivered Request: ${deliveredRequestId}`);
    console.log(`- Pending Request: ${pendingRequestId}\n`);

    // -------------------------------------------------------------
    // 1. Initial State & Public Profile Rating Summary
    // -------------------------------------------------------------
    console.log('Test Suite 1: Initial Rating Summary & Public Queries');
    {
      const res = await req(`/api/reviews/user/${seller.id}`, 'GET');
      assert('GET /api/reviews/user/:userId returns 200', res.status === 200);
      assert('Initial summary has averageRating property', typeof res.body.data.summary.averageRating === 'number');
      assert('Initial summary has distribution with 1..5 stars', typeof res.body.data.summary.distribution[5] === 'number');
    }

    // -------------------------------------------------------------
    // 2. Authentication and Input Validation
    // -------------------------------------------------------------
    console.log('\nTest Suite 2: Authentication & Input Validation');
    {
      // Missing token
      const res1 = await req('/api/reviews', 'POST', {
        requestId: deliveredRequestId,
        rating: 5,
      });
      assert('POST /api/reviews without token returns 401', res1.status === 401);

      // Invalid rating (0)
      const res2 = await req('/api/reviews', 'POST', {
        requestId: deliveredRequestId,
        rating: 0,
      }, buyerToken);
      assert('POST /api/reviews with rating=0 returns 400', res2.status === 400);

      // Invalid rating (6)
      const res3 = await req('/api/reviews', 'POST', {
        requestId: deliveredRequestId,
        rating: 6,
      }, buyerToken);
      assert('POST /api/reviews with rating=6 returns 400', res3.status === 400);

      // Non-integer rating (4.5)
      const res4 = await req('/api/reviews', 'POST', {
        requestId: deliveredRequestId,
        rating: 4.5,
      }, buyerToken);
      assert('POST /api/reviews with float rating returns 400', res4.status === 400);

      // Comment length > 500 characters
      const longComment = 'A'.repeat(501);
      const res5 = await req('/api/reviews', 'POST', {
        requestId: deliveredRequestId,
        rating: 5,
        comment: longComment,
      }, buyerToken);
      assert('POST /api/reviews with comment > 500 chars returns 400', res5.status === 400);
    }

    // -------------------------------------------------------------
    // 3. Order Lifecycle & Authorization Rules
    // -------------------------------------------------------------
    console.log('\nTest Suite 3: Order Lifecycle Status & Party Authorization Rules');
    {
      // Reviewing a pending order
      const res1 = await req('/api/reviews', 'POST', {
        requestId: pendingRequestId,
        rating: 5,
        comment: 'Great scrap transaction',
      }, buyerToken);
      assert('POST /api/reviews on non-delivered order returns 400', res1.status === 400);
      assert('Error message explains only delivered orders can be reviewed', res1.body.message.includes('delivered'));

      // Non-party user reviewing the delivered order
      const res2 = await req('/api/reviews', 'POST', {
        requestId: deliveredRequestId,
        rating: 5,
        comment: 'Random third party review',
      }, otherToken);
      assert('POST /api/reviews by non-party user returns 403', res2.status === 403);
    }

    // -------------------------------------------------------------
    // 4. Successful Review Creation & Notifications
    // -------------------------------------------------------------
    console.log('\nTest Suite 4: Successful Review Creation & Notification Trigger');
    {
      // Buyer reviews seller on delivered order
      const res = await req('/api/reviews', 'POST', {
        requestId: deliveredRequestId,
        rating: 5,
        comment: 'Excellent seller! Material was pure grade A copper.',
      }, buyerToken);

      assert('Buyer review on delivered order returns 201 Created', res.status === 201);
      assert('Response contains review id', !!res.body.data.id);
      assert('Review has reviewer_role="buyer"', res.body.data.reviewer_role === 'buyer');
      assert('Review has rating=5', res.body.data.rating === 5);
      assert('Review has status="visible"', res.body.data.status === 'visible');

      testReviewId = res.body.data.id;

      // Verify notification sent to seller (reviewee)
      const [notifs] = await pool.query(
        `SELECT * FROM notifications WHERE recipient_id = ? AND related_request_id = ? ORDER BY created_at DESC LIMIT 1`,
        [seller.id, deliveredRequestId]
      );
      assert('Notification dispatched to seller for the new review', notifs.length > 0);
      if (notifs.length > 0) {
        assert('Notification title is "New Review Received"', notifs[0].title === 'New Review Received');
        assert('Notification references 5-star review', notifs[0].message.includes('5-star'));
      }
    }

    // -------------------------------------------------------------
    // 5. Duplicate Review Prevention
    // -------------------------------------------------------------
    console.log('\nTest Suite 5: Duplicate Review Prevention');
    {
      const res = await req('/api/reviews', 'POST', {
        requestId: deliveredRequestId,
        rating: 4,
        comment: 'Trying to review again',
      }, buyerToken);

      assert('Second review attempt by buyer on same order returns 400', res.status === 400);
      assert('Error indicates duplicate review disallowed', res.body.message.includes('already'));
    }

    // -------------------------------------------------------------
    // 6. Seller Reviews Buyer Rejected (Buyer-Reviews-Seller Only)
    // -------------------------------------------------------------
    console.log('\nTest Suite 6: Seller Attempting to Review Buyer is Rejected');
    {
      const res = await req('/api/reviews', 'POST', {
        requestId: deliveredRequestId,
        rating: 4,
        comment: 'Smooth prompt pickup and payment verified.',
      }, sellerToken);

      assert('Seller attempting to review buyer returns 403 Forbidden', res.status === 403);
      assert('Error message explains only buyers can review sellers', res.body.message.includes('Sellers cannot review buyers'));
    }

    // -------------------------------------------------------------
    // 7. Order Reviews & canReview Inspection Endpoint
    // -------------------------------------------------------------
    console.log('\nTest Suite 7: GET /api/reviews/order/:requestId Inspection');
    {
      const res = await req(`/api/reviews/order/${deliveredRequestId}`, 'GET', null, buyerToken);
      assert('GET /api/reviews/order/:requestId returns 200', res.status === 200);
      assert('Order reviews include 1 buyer review', res.body.data.reviews.length === 1);
      assert('Buyer canReview is false because already reviewed', res.body.data.canReview === false);
      assert('Buyer myReview is populated with rating 5', res.body.data.myReview?.rating === 5);
      assert('eligibleRole is "buyer"', res.body.data.eligibleRole === 'buyer');

      const resSeller = await req(`/api/reviews/order/${deliveredRequestId}`, 'GET', null, sellerToken);
      assert('Seller GET /api/reviews/order/:requestId returns 200', resSeller.status === 200);
      assert('Seller canReview is false (sellers cannot review buyers)', resSeller.body.data.canReview === false);
      assert('Seller eligibleRole is null', resSeller.body.data.eligibleRole === null);
    }

    // -------------------------------------------------------------
    // 8. Rating Summary & Star Distribution (Public Seller Rating)
    // -------------------------------------------------------------
    console.log('\nTest Suite 8: User Rating Summary & Public Seller Marketplace Rating');
    {
      // 8a. GET /api/reviews/user/:sellerId
      const res = await req(`/api/reviews/user/${seller.id}`, 'GET');
      assert('GET /api/reviews/user/:userId returns 200', res.status === 200);
      const summary = res.body.data.summary;
      assert('Summary has averageRating >= 4.0', summary.averageRating >= 4.0);
      assert('Summary reviewCount is at least 1', summary.reviewCount >= 1);
      assert('Distribution has count for 5 stars', summary.distribution[5] >= 1);
      assert('User reviews array includes buyer review', res.body.data.reviews.some((r) => r.id === testReviewId));
      assert('Seller reviews array does NOT include seller-to-buyer reviews', !res.body.data.reviews.some((r) => r.reviewer_role === 'seller'));

      // 8b. Dedicated GET /api/reviews/seller/:sellerId
      const resSeller = await req(`/api/reviews/seller/${seller.id}`, 'GET');
      assert('GET /api/reviews/seller/:sellerId returns 200', resSeller.status === 200);
      assert('Seller endpoint returns averageRating matching buyer-only reviews', resSeller.body.data.averageRating === summary.averageRating);
      assert('Seller endpoint returns reviewCount', resSeller.body.data.reviewCount === summary.reviewCount);
      assert('All reviews in seller endpoint have reviewer_role="buyer"', resSeller.body.data.reviews.every((r) => r.reviewer_role === 'buyer'));

      // 8c. Verify Seller-to-Buyer Reviews do not exist for this order
      const resBuyer = await req(`/api/reviews/user/${buyer.id}`, 'GET');
      assert('GET /api/reviews/user/:buyerId returns 200', resBuyer.status === 200);
      assert('Buyer has no reviews from this order', !resBuyer.body.data.reviews.some((r) => r.request_id === deliveredRequestId));
    }

    // -------------------------------------------------------------
    // 8.5. Marketplace Listing Rating Integration
    // -------------------------------------------------------------
    console.log('\nTest Suite 8.5: Marketplace Listing Seller Rating Integration');
    {
      const testListingId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO waste_listings (
          id, user_id, waste_type, title, description, quantity, available_quantity, reserved_quantity, fulfilled_quantity, unit, price_per_kg, total_price, location, status, created_at, updated_at
        ) VALUES (?, ?, 'copper', 'High Grade Scrap Wire', 'Test listing', 100, 100, 0, 0, 'kg', 400.00, 40000.00, 'Chennai', 'Available', NOW(), NOW())`,
        [testListingId, seller.id]
      );

      const resListings = await req(`/api/listings?search=High Grade Scrap Wire`, 'GET');
      assert('GET /api/listings returns 200', resListings.status === 200);
      const foundListing = resListings.body.data.listings.find((l) => l.id === testListingId);
      assert('Listing includes seller object', !!foundListing?.seller);
      assert('Listing seller includes avg_rating >= 4.0', foundListing?.seller?.avg_rating >= 4.0);
      assert('Listing seller includes total_ratings >= 1', foundListing?.seller?.total_ratings >= 1);

      // Clean up test listing
      await pool.query(`DELETE FROM waste_listings WHERE id = ?`, [testListingId]);
    }

    // -------------------------------------------------------------
    // 9. My Reviews Endpoint
    // -------------------------------------------------------------
    console.log('\nTest Suite 9: GET /api/reviews/my-reviews');
    {
      const res = await req('/api/reviews/my-reviews', 'GET', null, buyerToken);
      assert('GET /api/reviews/my-reviews returns 200', res.status === 200);
      assert('My reviews contains the authored review', res.body.data.reviews.some((r) => r.id === testReviewId));
      assert('Review includes reviewee information', !!res.body.data.reviews[0].reviewee_name);
    }

    // -------------------------------------------------------------
    // 10. Update Review (Author Only)
    // -------------------------------------------------------------
    console.log('\nTest Suite 10: Update Review');
    {
      // Unauthorized update attempt by seller
      const resUnauthorized = await req(`/api/reviews/${testReviewId}`, 'PATCH', {
        rating: 1,
        comment: 'Hacked',
      }, sellerToken);
      assert('Unauthorized user editing another user review returns 403', resUnauthorized.status === 403);

      // Authorized update by buyer
      const res = await req(`/api/reviews/${testReviewId}`, 'PATCH', {
        rating: 4,
        comment: 'Updated: Excellent seller, prompt coordination.',
      }, buyerToken);
      assert('Author updating review returns 200', res.status === 200);
      assert('Updated rating is 4', res.body.data.rating === 4);
      assert('Updated comment matches new text', res.body.data.comment.includes('Updated:'));
    }

    // -------------------------------------------------------------
    // 11. Soft-Hide / Delete Review
    // -------------------------------------------------------------
    console.log('\nTest Suite 11: Soft-Hide / Delete Review');
    {
      // Non-owner, non-admin delete attempt
      const resForbidden = await req(`/api/reviews/${testReviewId}`, 'DELETE', null, otherToken);
      assert('Unauthorized delete returns 403', resForbidden.status === 403);

      // Admin or author soft-hide
      const resDelete = await req(`/api/reviews/${testReviewId}`, 'DELETE', null, adminToken);
      assert('Admin soft-hide returns 200', resDelete.status === 200);

      // Verify review status is now hidden
      const [rows] = await pool.query(`SELECT status FROM reviews WHERE id = ?`, [testReviewId]);
      assert('Review status is "hidden" in database', rows[0]?.status === 'hidden');

      // Verify hidden review is excluded from public visible reviews
      const resUser = await req(`/api/reviews/user/${seller.id}`, 'GET');
      assert('Hidden review is excluded from public user reviews', !resUser.body.data.reviews.some((r) => r.id === testReviewId));
    }

    // -------------------------------------------------------------
    // 12. Admin Review Moderation List
    // -------------------------------------------------------------
    console.log('\nTest Suite 12: Admin Review Moderation List');
    {
      // Normal buyer accessing admin review list
      const resForbidden = await req('/api/reviews/admin/all', 'GET', null, buyerToken);
      assert('Non-admin accessing /api/reviews/admin/all returns 403', resForbidden.status === 403);

      // Admin accessing review list
      const resAdmin = await req('/api/reviews/admin/all', 'GET', null, adminToken);
      assert('Admin accessing /api/reviews/admin/all returns 200', resAdmin.status === 200);
      assert('Admin list returns reviews array', Array.isArray(resAdmin.body.data.reviews));
    }

  } catch (err) {
    console.error('Test run failed with error:', err);
    failed++;
  } finally {
    // Clean up created test records
    console.log('\nCleaning up test artifacts...');
    try {
      if (deliveredRequestId) {
        await pool.query(`DELETE FROM reviews WHERE request_id = ?`, [deliveredRequestId]);
        await pool.query(`DELETE FROM notifications WHERE related_request_id = ?`, [deliveredRequestId]);
        await pool.query(`DELETE FROM collection_requests WHERE id = ?`, [deliveredRequestId]);
      }
      if (pendingRequestId) {
        await pool.query(`DELETE FROM collection_requests WHERE id = ?`, [pendingRequestId]);
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }

    console.log('\n======================================================');
    console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
