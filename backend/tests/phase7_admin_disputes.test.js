/**
 * tests/phase7_admin_disputes.test.js
 * -----------------------------------
 * Phase 7 Automated Validation Suite:
 * - Admin Role & Authorization (Route protection, 403 Forbidden for buyers/sellers)
 * - Admin Dashboard Platform Statistics (Real DB figures, zero mocks)
 * - Admin Order Management & Inspection (Audit logs, fulfillment history)
 * - Dispute Management Workflow (Creation, duplicate active prevention, admin review, status transition, mandatory resolution)
 * - Admin User Management (Activation/deactivation, admin self-deactivation guard)
 * - Append-only Dispute Activity Ledger
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');
const { pool } = require('../src/config/db');

const jwtSecret = process.env.JWT_SECRET || 'your-default-jwt-secret-replace-in-production';

function makeToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '1h' });
}

function req(path, method, data, token, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : '';
    const r = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...headers,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, body });
          }
        });
      }
    );
    r.on('error', reject);
    if (data) r.write(payload);
    r.end();
  });
}

async function runPhase7Tests() {
  console.log('===========================================================');
  console.log('  RUNNING PHASE 7: ADMIN DASHBOARD & DISPUTES TEST SUITE   ');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extraInfo = '') {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
      failed++;
    }
  }

  // 1. Fetch test users from DB
  const [users] = await pool.query(`SELECT id, email, role, is_active FROM users LIMIT 20`);
  const adminUser = users.find((u) => u.role === 'admin') || {
    id: 'a1b2c3d4-9999-0000-0000-000000000001',
    email: 'admin@rubbishrevamp.dev',
    role: 'admin',
  };
  const buyerUser = users.find((u) => u.role === 'buyer') || {
    id: 'buyer-test-id',
    email: 'buyer@test.dev',
    role: 'buyer',
  };
  const sellerUser = users.find((u) => u.role === 'seller') || {
    id: 'seller-test-id',
    email: 'seller@test.dev',
    role: 'seller',
  };

  const adminToken = makeToken(adminUser);
  const buyerToken = makeToken(buyerUser);
  const sellerToken = makeToken(sellerUser);

  // An unrelated 3rd party user
  const outsiderToken = makeToken({ id: 'outsider-user-999', email: 'outsider@test.dev', role: 'buyer' });

  // -------------------------------------------------------------
  // Test 1: Admin Route Protection (Unauthenticated request rejected)
  // -------------------------------------------------------------
  console.log('\n--- Section 1: Admin Route Authorization ---');
  const unauthRes = await req('/api/admin/stats', 'GET', null, null);
  assert(
    'Test 1: Unauthenticated request to /api/admin/stats rejected with 401',
    unauthRes.status === 401
  );

  // -------------------------------------------------------------
  // Test 2: Buyer Access Rejection (403 Forbidden)
  // -------------------------------------------------------------
  const buyerAdminRes = await req('/api/admin/stats', 'GET', null, buyerToken);
  assert(
    'Test 2: Buyer access to /api/admin/stats returns 403 Forbidden',
    buyerAdminRes.status === 403
  );

  // -------------------------------------------------------------
  // Test 3: Seller Access Rejection (403 Forbidden)
  // -------------------------------------------------------------
  const sellerAdminRes = await req('/api/admin/orders', 'GET', null, sellerToken);
  assert(
    'Test 3: Seller access to /api/admin/orders returns 403 Forbidden',
    sellerAdminRes.status === 403
  );

  // -------------------------------------------------------------
  // Test 4: Admin Access to Platform Statistics (200 OK)
  // -------------------------------------------------------------
  console.log('\n--- Section 2: Admin Dashboard Platform Statistics ---');
  const statsRes = await req('/api/admin/stats', 'GET', null, adminToken);
  assert(
    'Test 4: Admin receives 200 OK for /api/admin/stats',
    statsRes.status === 200 && statsRes.body.success === true
  );

  const stats = statsRes.body.data?.stats || statsRes.body.data;
  assert(
    'Test 5: Platform stats includes user breakdown (total, buyers, sellers)',
    stats &&
      (typeof stats.total_users === 'number' || typeof stats.users?.total === 'number') &&
      (typeof stats.total_buyers === 'number' || typeof stats.users?.buyers === 'number') &&
      (typeof stats.total_sellers === 'number' || typeof stats.users?.sellers === 'number')
  );

  assert(
    'Test 6: Platform stats includes full order lifecycle distribution',
    stats &&
      (typeof stats.total_requests === 'number' || typeof stats.orders?.total === 'number') &&
      (typeof stats.pending_requests === 'number' || typeof stats.orders?.pending === 'number') &&
      (typeof stats.awaiting_payment_orders === 'number' || typeof stats.orders?.awaiting_payment === 'number') &&
      (typeof stats.confirmed_orders === 'number' || typeof stats.orders?.confirmed === 'number') &&
      (typeof stats.ready_for_pickup_orders === 'number' || typeof stats.orders?.ready_for_pickup === 'number') &&
      (typeof stats.in_transit_orders === 'number' || typeof stats.orders?.in_transit === 'number') &&
      (typeof stats.delivered_orders === 'number' || typeof stats.orders?.delivered === 'number') &&
      (typeof stats.cancelled_orders === 'number' || typeof stats.orders?.cancelled === 'number') &&
      (typeof stats.disputed_orders === 'number' || typeof stats.orders?.disputed === 'number')
  );

  assert(
    'Test 7: Platform stats includes dispute counts and fulfilled quantity',
    stats &&
      (typeof stats.total_disputes === 'number' || typeof stats.disputes?.total === 'number') &&
      (typeof stats.open_disputes === 'number' || typeof stats.disputes?.open === 'number') &&
      (typeof stats.total_fulfilled_quantity_kg === 'number' || typeof stats.orders?.total_fulfilled_quantity === 'number')
  );

  // -------------------------------------------------------------
  // Test 8: Admin Order Management (Listing, Filtering, Details)
  // -------------------------------------------------------------
  console.log('\n--- Section 3: Admin Order Management ---');
  const ordersRes = await req('/api/admin/orders?limit=10', 'GET', null, adminToken);
  assert(
    'Test 8: Admin successfully lists orders with pagination',
    ordersRes.status === 200 && Array.isArray(ordersRes.body.data?.orders)
  );

  const testOrder = ordersRes.body.data?.orders[0];
  if (testOrder) {
    const orderDetailsRes = await req(`/api/admin/orders/${testOrder.id}`, 'GET', null, adminToken);
    assert(
      'Test 9: Admin retrieves complete order details with tracking and payment',
      orderDetailsRes.status === 200 &&
        orderDetailsRes.body.data?.order?.id === testOrder.id &&
        Array.isArray(orderDetailsRes.body.data?.order?.tracking_updates)
    );
  } else {
    console.log('  [SKIP] Test 9: No orders available in DB for inspection');
  }

  // -------------------------------------------------------------
  // Test 10: Admin User Management
  // -------------------------------------------------------------
  console.log('\n--- Section 4: Admin User Management ---');
  const usersRes = await req('/api/admin/users?limit=10', 'GET', null, adminToken);
  assert(
    'Test 10: Admin lists platform users with pagination',
    usersRes.status === 200 && Array.isArray(usersRes.body.data?.users)
  );

  // Test admin self-deactivation protection
  const selfDeactivateRes = await req(
    `/api/admin/users/${adminUser.id}/status`,
    'PATCH',
    { is_active: false },
    adminToken
  );
  assert(
    'Test 11: Admin self-deactivation is strictly rejected with 403',
    selfDeactivateRes.status === 403
  );

  // -------------------------------------------------------------
  // Section 5: Dispute Management Lifecycle
  // -------------------------------------------------------------
  console.log('\n--- Section 5: Dispute Workflow ---');

  // Find or create an eligible order for dispute testing
  const [existingOrders] = await pool.query(
    `SELECT id, buyer_id, seller_id, status FROM collection_requests 
     WHERE status NOT IN ('cancelled', 'pending') LIMIT 5`
  );

  let targetOrder = existingOrders[0];

  if (!targetOrder) {
    // If none exists, fetch any order or create one
    const [anyOrders] = await pool.query(`SELECT id, buyer_id, seller_id, status FROM collection_requests LIMIT 1`);
    targetOrder = anyOrders[0];
  }

  if (!targetOrder) {
    console.log('  [SKIP] No order available for dispute testing');
  } else {
    // Clear any previous disputes for this order to ensure fresh state
    await pool.query(`DELETE FROM dispute_activity WHERE dispute_id IN (SELECT id FROM order_disputes WHERE request_id = ?)`, [targetOrder.id]);
    await pool.query(`DELETE FROM order_disputes WHERE request_id = ?`, [targetOrder.id]);

    const orderBuyerToken = makeToken({ id: targetOrder.buyer_id, email: 'buyer@test.dev', role: 'buyer' });
    const orderSellerToken = makeToken({ id: targetOrder.seller_id, email: 'seller@test.dev', role: 'seller' });

    // Test 12: Unauthorized user cannot raise dispute
    const unauthorizedDisputeRes = await req(
      '/api/disputes',
      'POST',
      {
        request_id: targetOrder.id,
        reason: 'Material not matching description',
        description: 'Quality is inferior to sample photos.',
      },
      outsiderToken
    );
    assert(
      'Test 12: Unrelated user attempting to raise dispute is rejected with 403',
      unauthorizedDisputeRes.status === 403
    );

    // Test 13: Authorized Buyer raises a dispute
    const buyerDisputeRes = await req(
      '/api/disputes',
      'POST',
      {
        request_id: targetOrder.id,
        reason: 'Quality issue',
        description: 'Scrap contains high moisture and contamination.',
      },
      orderBuyerToken
    );
    assert(
      'Test 13: Authorized Buyer successfully raises dispute (status 201)',
      buyerDisputeRes.status === 201 && buyerDisputeRes.body.success === true
    );

    const disputeId = buyerDisputeRes.body.data?.dispute?.id;

    // Test 14: Duplicate active dispute prevention
    const duplicateDisputeRes = await req(
      '/api/disputes',
      'POST',
      {
        request_id: targetOrder.id,
        reason: 'Another issue',
        description: 'Duplicate dispute attempt.',
      },
      orderBuyerToken
    );
    assert(
      'Test 14: Duplicate active dispute for same order is rejected with 400',
      duplicateDisputeRes.status === 400
    );

    // Test 15: Non-admin cannot update dispute status
    const buyerUpdateRes = await req(
      `/api/disputes/${disputeId}/status`,
      'PATCH',
      { status: 'under_review' },
      orderBuyerToken
    );
    assert(
      'Test 15: Non-admin attempting to update dispute status is rejected with 403',
      buyerUpdateRes.status === 403
    );

    // Test 16: Admin reviews dispute and transitions to under_review
    const adminReviewRes = await req(
      `/api/disputes/${disputeId}/status`,
      'PATCH',
      { status: 'under_review', admin_notes: 'Reviewing seller pickup receipt and photos' },
      adminToken
    );
    assert(
      'Test 16: Admin transitions dispute to under_review with notes',
      adminReviewRes.status === 200 && adminReviewRes.body.data?.dispute?.status === 'under_review'
    );

    // Test 17: Admin resolves dispute WITHOUT mandatory notes is rejected
    const invalidResolveRes = await req(
      `/api/disputes/${disputeId}/resolve`,
      'PATCH',
      { resolution: '' },
      adminToken
    );
    assert(
      'Test 17: Resolving dispute without mandatory explanation is rejected with 400',
      invalidResolveRes.status === 400
    );

    // Test 18: Admin resolves dispute WITH mandatory resolution notes
    const resolveRes = await req(
      `/api/disputes/${disputeId}/resolve`,
      'PATCH',
      {
        resolution: 'Quality discrepancy verified. Seller agreed to a 10% credit note on next shipment.',
        admin_notes: 'Resolution reached via mediation call with both parties.',
      },
      adminToken
    );
    assert(
      'Test 18: Admin resolves dispute with resolution explanation (status 200)',
      resolveRes.status === 200 && resolveRes.body.data?.dispute?.status === 'resolved'
    );

    // Test 19: Dispute details and append-only activity ledger
    const disputeDetailsRes = await req(`/api/disputes/${disputeId}`, 'GET', null, adminToken);
    const historyRes = await req(`/api/disputes/${disputeId}/history`, 'GET', null, adminToken);
    const historyCount = disputeDetailsRes.body.data?.dispute?.activity_history?.length || historyRes.body.data?.history?.length || 0;
    assert(
      'Test 19: Admin retrieves dispute details with activity ledger',
      disputeDetailsRes.status === 200 && historyCount >= 3 // raised, under_review, resolved
    );

    // Test 20: Re-opening already completed dispute without proper workflow rejected
    const invalidReopenRes = await req(
      `/api/disputes/${disputeId}/status`,
      'PATCH',
      { status: 'under_review' },
      adminToken
    );
    assert(
      'Test 20: Transitioning completed dispute back to under_review is rejected',
      invalidReopenRes.status === 400
    );
  }

  console.log('\n===========================================================');
  console.log(`  PHASE 7 TEST RESULTS: ${passed} PASSED, ${failed} FAILED `);
  console.log('===========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase7Tests()
  .catch((err) => {
    console.error('Fatal error running Phase 7 tests:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
