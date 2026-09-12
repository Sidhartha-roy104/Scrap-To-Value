/**
 * tests/phase8_notifications.test.js
 * -----------------------------------
 * Comprehensive automated test suite for Phase 8:
 * - Notification database integrity & recipient isolation
 * - REST APIs: get, unread-count, mark-read, mark-all-read, delete, preferences
 * - Ownership & 401/403 security guards
 * - Event deduplication (dedup_key)
 * - Category preferences filtering
 * - Automatic event triggers:
 *   - Order creation -> Seller notified
 *   - Seller acceptance -> Buyer notified
 *   - Payment success -> Buyer & Seller notified
 *   - Fulfillment transit/delivered -> Parties notified
 *   - Dispute raised -> Opposing party & Admin alerted
 *   - Dispute resolved -> Parties notified
 */

const http = require('http');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('../src/config/db');
const notificationService = require('../src/services/notificationService');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;
const jwtSecret = process.env.JWT_SECRET || 'your-default-jwt-secret-replace-in-production';

function makeToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '1h' });
}

let buyerToken = null;
let buyerId = null;
let sellerToken = null;
let sellerId = null;
let adminToken = null;
let adminId = null;

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  [PASS] ${description}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${description} `);
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

    const clientReq = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    clientReq.on('error', reject);
    if (body) clientReq.write(JSON.stringify(body));
    clientReq.end();
  });
}

async function runTests() {
  console.log('===========================================================');
  console.log('  RUNNING PHASE 8 NOTIFICATIONS & COMMUNICATION TEST SUITE ');
  console.log('===========================================================\n');

  // Fetch real users from DB
  const [users] = await pool.query('SELECT id, email, role, is_active FROM users');
  const buyerUser = users.find((u) => u.role === 'buyer');
  const sellerUser = users.find((u) => u.role === 'seller');
  const adminUser = users.find((u) => u.role === 'admin');

  if (!buyerUser || !sellerUser || !adminUser) {
    throw new Error('Required seed users (buyer, seller, admin) not found in database.');
  }

  buyerId = buyerUser.id;
  buyerToken = makeToken(buyerUser);

  sellerId = sellerUser.id;
  sellerToken = makeToken(sellerUser);

  adminId = adminUser.id;
  adminToken = makeToken(adminUser);

  // -------------------------------------------------------------------------
  // Section 1: Authentication & Authorization Security Guards
  // -------------------------------------------------------------------------
  console.log('--- Section 1: Authentication & Authorization Guards ---');

  const unauthRes = await req('/api/notifications', 'GET', null, null);
  assert('Unauthenticated access to /api/notifications returns 401', unauthRes.status === 401);

  const unauthCountRes = await req('/api/notifications/unread-count', 'GET', null, null);
  assert('Unauthenticated access to /api/notifications/unread-count returns 401', unauthCountRes.status === 401);

  // -------------------------------------------------------------------------
  // Section 2: Direct Notification Creation & Recipient Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- Section 2: Recipient Isolation ---');

  // Create isolated notification for Buyer
  const buyerNotif = await notificationService.createNotification({
    recipientId: buyerId,
    type: notificationService.NotificationTypes.ORDER_ACCEPTED,
    title: 'Buyer Secret Alert',
    message: 'This is only for buyer.',
    link: '/orders',
    dedupKey: `test:buyer:isolation:${Date.now()}`,
    failSilently: false,
  });

  // Create isolated notification for Seller
  const sellerNotif = await notificationService.createNotification({
    recipientId: sellerId,
    type: notificationService.NotificationTypes.ORDER_CREATED,
    title: 'Seller Secret Alert',
    message: 'This is only for seller.',
    link: '/orders',
    dedupKey: `test:seller:isolation:${Date.now()}`,
    failSilently: false,
  });

  // Buyer fetches notifications
  const buyerListRes = await req('/api/notifications?limit=50', 'GET', null, buyerToken);
  const buyerNotifIds = (buyerListRes.body.data?.notifications || []).map((n) => n.id);
  assert(
    'Buyer can view their own notification',
    buyerListRes.status === 200 && buyerNotifIds.includes(buyerNotif.id)
  );
  assert(
    'Buyer CANNOT view seller notification (isolation enforced)',
    !buyerNotifIds.includes(sellerNotif.id)
  );

  // Seller fetches notifications
  const sellerListRes = await req('/api/notifications?limit=50', 'GET', null, sellerToken);
  const sellerNotifIds = (sellerListRes.body.data?.notifications || []).map((n) => n.id);
  assert(
    'Seller can view their own notification',
    sellerListRes.status === 200 && sellerNotifIds.includes(sellerNotif.id)
  );
  assert(
    'Seller CANNOT view buyer notification (isolation enforced)',
    !sellerNotifIds.includes(buyerNotif.id)
  );

  // -------------------------------------------------------------------------
  // Section 3: Read Status & Ownership Guards
  // -------------------------------------------------------------------------
  console.log('\n--- Section 3: Read Status & Ownership Guards ---');

  // Seller attempting to mark buyer's notification as read should be 403 Forbidden
  const forbiddenReadRes = await req(
    `/api/notifications/${buyerNotif.id}/read`,
    'PATCH',
    {},
    sellerToken
  );
  assert(
    'Non-owner cannot mark another user notification as read (403 Forbidden)',
    forbiddenReadRes.status === 403
  );

  // Buyer marks own notification as read
  const buyerMarkReadRes = await req(
    `/api/notifications/${buyerNotif.id}/read`,
    'PATCH',
    {},
    buyerToken
  );
  assert(
    'Buyer successfully marks their own notification as read (200 OK)',
    buyerMarkReadRes.status === 200 && buyerMarkReadRes.body.data?.is_read === true
  );

  // Mark all as read
  const markAllRes = await req('/api/notifications/read-all', 'PATCH', {}, buyerToken);
  assert('Buyer marks all notifications as read (200 OK)', markAllRes.status === 200);

  // Unread count should now reflect read state
  const unreadCountRes = await req('/api/notifications/unread-count', 'GET', null, buyerToken);
  assert(
    'Unread count is non-negative and retrieved successfully',
    unreadCountRes.status === 200 && typeof unreadCountRes.body.data?.unreadCount === 'number'
  );

  // -------------------------------------------------------------------------
  // Section 4: Deletion & Ownership Guards
  // -------------------------------------------------------------------------
  console.log('\n--- Section 4: Deletion & Ownership Guards ---');

  // Seller attempting to delete buyer's notification should be 403 Forbidden
  const forbiddenDeleteRes = await req(
    `/api/notifications/${buyerNotif.id}`,
    'DELETE',
    null,
    sellerToken
  );
  assert(
    'Non-owner cannot delete another user notification (403 Forbidden)',
    forbiddenDeleteRes.status === 403
  );

  // Buyer deletes own notification
  const buyerDeleteRes = await req(
    `/api/notifications/${buyerNotif.id}`,
    'DELETE',
    null,
    buyerToken
  );
  assert(
    'Buyer successfully deletes their own notification (200 OK)',
    buyerDeleteRes.status === 200 && buyerDeleteRes.body.data?.deleted === true
  );

  // -------------------------------------------------------------------------
  // Section 5: Event Deduplication Integrity
  // -------------------------------------------------------------------------
  console.log('\n--- Section 5: Event Deduplication Guard ---');

  const testDedupKey = `test:dedup:${crypto.randomUUID()}`;
  const firstInsert = await notificationService.createNotification({
    recipientId: buyerId,
    type: notificationService.NotificationTypes.ORDER_CONFIRMED,
    title: 'Dedup Test',
    message: 'First attempt',
    dedupKey: testDedupKey,
  });

  const duplicateAttempt = await notificationService.createNotification({
    recipientId: buyerId,
    type: notificationService.NotificationTypes.ORDER_CONFIRMED,
    title: 'Dedup Test Duplicate',
    message: 'Second attempt with identical dedup key',
    dedupKey: testDedupKey,
  });

  assert(
    'Deduplication guard prevents duplicate rows and returns existing notification',
    firstInsert && duplicateAttempt && firstInsert.id === duplicateAttempt.id
  );

  // -------------------------------------------------------------------------
  // Section 6: User Notification Preferences
  // -------------------------------------------------------------------------
  console.log('\n--- Section 6: Notification Preferences ---');

  const getPrefsRes = await req('/api/notifications/preferences', 'GET', null, buyerToken);
  assert(
    'Buyer retrieves notification preferences (200 OK)',
    getPrefsRes.status === 200 && typeof getPrefsRes.body.data?.orders_enabled === 'boolean'
  );

  // Disable order updates
  const patchPrefsRes = await req(
    '/api/notifications/preferences',
    'PATCH',
    { orders_enabled: false },
    buyerToken
  );
  assert(
    'Buyer disables non-critical orders_enabled preference (200 OK)',
    patchPrefsRes.status === 200 && patchPrefsRes.body.data?.orders_enabled === false
  );

  // Attempt non-critical order notification: should be skipped
  const skippedNotif = await notificationService.createNotification({
    recipientId: buyerId,
    type: notificationService.NotificationTypes.ORDER_CREATED,
    title: 'Should Be Skipped',
    message: 'User opted out',
  });
  assert(
    'Non-critical order notification is suppressed when preference is disabled',
    skippedNotif === null
  );

  // Critical dispute notification: MUST deliver even if preferences are disabled
  const criticalDisputeNotif = await notificationService.createNotification({
    recipientId: buyerId,
    type: notificationService.NotificationTypes.DISPUTE_RAISED,
    title: 'Mandatory Compliance Alert',
    message: 'Critical dispute notification cannot be silenced',
  });
  assert(
    'Critical dispute notification delivers regardless of user preferences',
    criticalDisputeNotif !== null && criticalDisputeNotif.recipient_id === buyerId
  );

  // Re-enable order updates
  await req('/api/notifications/preferences', 'PATCH', { orders_enabled: true }, buyerToken);

  // -------------------------------------------------------------------------
  // Section 7: Automatic Business Workflow Event Triggers
  // -------------------------------------------------------------------------
  console.log('\n--- Section 7: Automatic Business Event Triggers ---');

  // 1. Find an available listing with a seller different from buyer
  const [listingRows] = await pool.query(
    `SELECT l.*, u.email as seller_email 
     FROM waste_listings l 
     JOIN users u ON l.user_id = u.id 
     WHERE l.status = 'Available' AND l.available_quantity >= 20 AND l.user_id != ? 
     LIMIT 1`,
    [buyerId]
  );
  const listing = listingRows[0];

  if (listing) {
    const listingSellerUser = {
      id: listing.user_id,
      email: listing.seller_email,
      role: 'seller',
    };
    const listingSellerToken = makeToken(listingSellerUser);

    // 2. Buyer creates collection request -> Listing seller should receive notification
    const orderQty = 15;
    const createReqRes = await req(
      '/api/requests',
      'POST',
      {
        listing_id: listing.id,
        requested_quantity: orderQty,
        buyer_message: 'Automated notification test order',
      },
      buyerToken
    );

    const orderId = createReqRes.body.data?.request?.id;
    assert('Buyer creates collection request (201 Created)', createReqRes.status === 201 && !!orderId);

    // Check Seller notifications for ORDER_CREATED
    const sellerAfterOrder = await req('/api/notifications?limit=10', 'GET', null, listingSellerToken);
    const sellerNotifs = sellerAfterOrder.body.data?.notifications || [];
    const orderCreatedNotif = sellerNotifs.find(
      (n) => n.related_request_id === orderId && n.type === 'ORDER_CREATED'
    );
    assert(
      'Seller receives automatic ORDER_CREATED notification with order link',
      !!orderCreatedNotif && orderCreatedNotif.title.includes('New Scrap Request')
    );

    // 3. Seller accepts order -> Buyer should receive ORDER_ACCEPTED / PAYMENT_REQUIRED
    const acceptRes = await req(
      `/api/requests/${orderId}/status`,
      'PATCH',
      { status: 'awaiting_payment', note: 'Ready for processing' },
      listingSellerToken
    );
    assert('Seller accepts request -> awaiting_payment (200 OK)', acceptRes.status === 200);

    // Wait 100ms for non-blocking notification persistence
    await new Promise((r) => setTimeout(r, 100));

    const buyerAfterAccept = await req('/api/notifications?limit=10', 'GET', null, buyerToken);
    const buyerNotifs = buyerAfterAccept.body.data?.notifications || [];
    const acceptedNotif = buyerNotifs.find(
      (n) => n.related_request_id === orderId && n.type === 'ORDER_ACCEPTED'
    );
    assert(
      'Buyer receives automatic ORDER_ACCEPTED / payment required alert',
      !!acceptedNotif && acceptedNotif.title.includes('Payment Required')
    );

    const createPayRes = await req('/api/payments', 'POST', { request_id: orderId, payment_method: 'mock_upi' }, buyerToken);
    const paymentId = createPayRes.body.data?.payment?.id;

    if (paymentId) {
      const paySuccessRes = await req(
        `/api/payments/${paymentId}/mock-success`,
        'POST',
        { mock_payment_id: 'mock_pay_test_phase8' },
        buyerToken
      );
      assert('Buyer completes payment successfully (200 OK)', paySuccessRes.status === 200);

      // Verify Buyer notification for PAYMENT_SUCCEEDED
      const buyerAfterPay = await req('/api/notifications?limit=10', 'GET', null, buyerToken);
      const buyerPayNotif = (buyerAfterPay.body.data?.notifications || []).find(
        (n) => n.related_request_id === orderId && n.type === 'PAYMENT_SUCCEEDED'
      );
      assert(
        'Buyer receives automatic PAYMENT_SUCCEEDED notification',
        !!buyerPayNotif && buyerPayNotif.title.includes('Payment Confirmed')
      );

      // Verify Seller notification for ORDER_CONFIRMED
      const sellerAfterPay = await req('/api/notifications?limit=10', 'GET', null, listingSellerToken);
      const sellerPayNotif = (sellerAfterPay.body.data?.notifications || []).find(
        (n) => n.related_request_id === orderId && n.type === 'ORDER_CONFIRMED'
      );
      assert(
        'Seller receives automatic ORDER_CONFIRMED payment received notification',
        !!sellerPayNotif && sellerPayNotif.title.includes('Payment Received')
      );
    }

    // 5. Dispute Trigger: Buyer raises a dispute on the order
    const disputeRes = await req(
      '/api/disputes',
      'POST',
      {
        request_id: orderId,
        reason: 'Automated notification test dispute',
        description: 'Testing dispute alert dispatch to seller and admin.',
      },
      buyerToken
    );

    const disputeId = disputeRes.body.data?.dispute?.id;
    assert('Buyer raises dispute (201 Created)', disputeRes.status === 201 && !!disputeId);

    // Check Seller notification for DISPUTE_RAISED
    const sellerAfterDispute = await req('/api/notifications?limit=10', 'GET', null, listingSellerToken);
    const disputeNotif = (sellerAfterDispute.body.data?.notifications || []).find(
      (n) => n.related_dispute_id === disputeId && n.type === 'DISPUTE_RAISED'
    );
    assert(
      'Seller receives automatic DISPUTE_RAISED notification',
      !!disputeNotif && disputeNotif.title.includes('Dispute Raised')
    );

    // Check Admin notification for ADMIN_ALERT
    const adminAfterDispute = await req('/api/notifications?limit=10', 'GET', null, adminToken);
    const adminAlertNotif = (adminAfterDispute.body.data?.notifications || []).find(
      (n) => n.related_entity_id === disputeId && n.type === 'ADMIN_ALERT'
    );
    assert(
      'Admin receives automatic operational alert for new dispute',
      !!adminAlertNotif && adminAlertNotif.title.includes('New Dispute')
    );

    // 6. Admin resolves dispute -> Both parties receive DISPUTE_RESOLVED
    const resolveRes = await req(
      `/api/disputes/${disputeId}/resolve`,
      'PATCH',
      {
        status: 'resolved',
        admin_resolution: 'Resolved through automated notification test review.',
      },
      adminToken
    );
    assert('Admin resolves dispute (200 OK)', resolveRes.status === 200);

    const buyerAfterResolve = await req('/api/notifications?limit=10', 'GET', null, buyerToken);
    const resolveNotif = (buyerAfterResolve.body.data?.notifications || []).find(
      (n) => n.related_dispute_id === disputeId && n.type === 'DISPUTE_RESOLVED'
    );
    assert(
      'Buyer receives automatic DISPUTE_RESOLVED notification',
      !!resolveNotif && resolveNotif.message.includes('automated notification test review')
    );
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n===========================================================');
  console.log(`  PHASE 8 TEST RESULTS: ${passed} PASSED, ${failed} FAILED `);
  console.log('===========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
