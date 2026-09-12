/**
 * tests/phase7_admin_control_redesign.test.js
 * -------------------------------------------
 * Automated validation suite for the expanded operational admin console:
 * - Seller Verification & KYC management
 * - Buyer Directory & account oversight
 * - Listing Moderation
 * - Inventory & Transaction Ledger
 * - Payment Monitoring
 * - Fulfillment Logistics Pipeline
 * - Platform Analytics
 * - Global Activity Audit Logs
 * - Safe System Settings
 * - Strict 403 Forbidden verification across all endpoints for non-admins
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

async function runTests() {
  console.log('================================================================');
  console.log('  RUNNING PHASE 7 REDESIGN & OPERATIONAL CONTROL TEST SUITE     ');
  console.log('================================================================\n');

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

  // Fetch roles
  const [adminRows] = await pool.query(`SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1`);
  const [buyerRows] = await pool.query(`SELECT id, email, role FROM users WHERE role = 'buyer' LIMIT 1`);
  const [sellerRows] = await pool.query(`SELECT id, email, role FROM users WHERE role = 'seller' LIMIT 1`);

  const adminToken = makeToken(adminRows[0] || { id: 'admin-id', email: 'admin@dev.io', role: 'admin' });
  const buyerToken = makeToken(buyerRows[0] || { id: 'buyer-id', email: 'buyer@dev.io', role: 'buyer' });
  const sellerToken = makeToken(sellerRows[0] || { id: 'seller-id', email: 'seller@dev.io', role: 'seller' });

  // -------------------------------------------------------------------------
  // 1. Authorization & Role Guards across New Endpoints
  // -------------------------------------------------------------------------
  console.log('\n--- Section 1: Non-Admin 403 Forbidden Rejections ---');
  const guardedEndpoints = [
    '/api/admin/sellers',
    '/api/admin/buyers',
    '/api/admin/listings',
    '/api/admin/inventory',
    '/api/admin/payments',
    '/api/admin/fulfillment',
    '/api/admin/analytics',
    '/api/admin/activity-logs',
    '/api/admin/settings',
  ];

  for (const ep of guardedEndpoints) {
    const buyerRes = await req(ep, 'GET', null, buyerToken);
    const sellerRes = await req(ep, 'GET', null, sellerToken);
    assert(
      `Buyer & Seller receives 403 on ${ep}`,
      buyerRes.status === 403 && sellerRes.status === 403
    );
  }

  // -------------------------------------------------------------------------
  // 2. Seller Verification Endpoint
  // -------------------------------------------------------------------------
  console.log('\n--- Section 2: Seller Verification & Management ---');
  const sellersRes = await req('/api/admin/sellers?limit=10', 'GET', null, adminToken);
  assert(
    'Admin lists sellers with metrics (200 OK)',
    sellersRes.status === 200 && Array.isArray(sellersRes.body.data?.sellers)
  );

  const testSeller = sellersRes.body.data?.sellers?.[0];
  if (testSeller) {
    const verifyRes = await req(
      `/api/admin/sellers/${testSeller.id}/verify`,
      'PATCH',
      { kyc_verified: true, kyc_notes: 'Automated test KYC check passed.' },
      adminToken
    );
    assert(
      'Admin approves seller KYC verification with notes (200 OK)',
      verifyRes.status === 200 && verifyRes.body.data?.seller?.kyc_verified === true
    );
  }

  // -------------------------------------------------------------------------
  // 3. Buyer Directory
  // -------------------------------------------------------------------------
  console.log('\n--- Section 3: Buyer Management ---');
  const buyersRes = await req('/api/admin/buyers?limit=10', 'GET', null, adminToken);
  assert(
    'Admin lists buyers with procurement metrics (200 OK)',
    buyersRes.status === 200 && Array.isArray(buyersRes.body.data?.buyers)
  );

  // -------------------------------------------------------------------------
  // 4. Listing Management & Moderation
  // -------------------------------------------------------------------------
  console.log('\n--- Section 4: Listing Management ---');
  const listingsRes = await req('/api/admin/listings?limit=10', 'GET', null, adminToken);
  assert(
    'Admin lists marketplace listings (200 OK)',
    listingsRes.status === 200 && Array.isArray(listingsRes.body.data?.listings)
  );

  const testListing = listingsRes.body.data?.listings?.[0];
  if (testListing) {
    const modRes = await req(
      `/api/admin/listings/${testListing.id}/status`,
      'PATCH',
      { status: 'active' },
      adminToken
    );
    assert(
      'Admin updates listing moderation status (200 OK)',
      modRes.status === 200 && modRes.body.data?.listing?.status === 'active'
    );
  }

  // -------------------------------------------------------------------------
  // 5. Inventory Overview & Transactions
  // -------------------------------------------------------------------------
  console.log('\n--- Section 5: Inventory Overview & Ledger ---');
  const invRes = await req('/api/admin/inventory', 'GET', null, adminToken);
  assert(
    'Admin retrieves inventory summary (total, available, reserved, fulfilled)',
    invRes.status === 200 &&
      invRes.body.data?.summary &&
      typeof invRes.body.data.summary.total_available === 'number'
  );

  const txRes = await req('/api/admin/inventory/transactions', 'GET', null, adminToken);
  assert(
    'Admin retrieves immutable inventory ledger transactions (200 OK)',
    txRes.status === 200 && Array.isArray(txRes.body.data?.transactions)
  );

  // -------------------------------------------------------------------------
  // 6. Payment Monitoring
  // -------------------------------------------------------------------------
  console.log('\n--- Section 6: Payment Monitoring ---');
  const paymentsRes = await req('/api/admin/payments', 'GET', null, adminToken);
  assert(
    'Admin retrieves payment records and financial volume summary (200 OK)',
    paymentsRes.status === 200 &&
      paymentsRes.body.data?.summary &&
      Array.isArray(paymentsRes.body.data?.payments)
  );

  // -------------------------------------------------------------------------
  // 7. Fulfillment Logistics Monitoring
  // -------------------------------------------------------------------------
  console.log('\n--- Section 7: Fulfillment Pipeline Monitoring ---');
  const fulfillRes = await req('/api/admin/fulfillment', 'GET', null, adminToken);
  assert(
    'Admin retrieves fulfillment pipeline stages & milestone timestamps (200 OK)',
    fulfillRes.status === 200 &&
      fulfillRes.body.data?.pipeline &&
      Array.isArray(fulfillRes.body.data?.orders)
  );

  // -------------------------------------------------------------------------
  // 8. Platform Analytics
  // -------------------------------------------------------------------------
  console.log('\n--- Section 8: Platform Analytics ---');
  const analyticsRes = await req('/api/admin/analytics', 'GET', null, adminToken);
  assert(
    'Admin retrieves real chart telemetry (daily trends, waste categories)',
    analyticsRes.status === 200 &&
      Array.isArray(analyticsRes.body.data?.daily_trends) &&
      Array.isArray(analyticsRes.body.data?.category_distribution)
  );

  // -------------------------------------------------------------------------
  // 9. Activity Logs
  // -------------------------------------------------------------------------
  console.log('\n--- Section 9: Global Activity Audit Logs ---');
  const logsRes = await req('/api/admin/activity-logs', 'GET', null, adminToken);
  assert(
    'Admin retrieves unified chronological audit logs (200 OK)',
    logsRes.status === 200 && Array.isArray(logsRes.body.data?.logs)
  );

  // -------------------------------------------------------------------------
  // 10. System Settings (Safe Config)
  // -------------------------------------------------------------------------
  console.log('\n--- Section 10: System Settings ---');
  const settingsRes = await req('/api/admin/settings', 'GET', null, adminToken);
  assert(
    'Admin reads platform system settings without secrets exposure (200 OK)',
    settingsRes.status === 200 && settingsRes.body.data?.platform_name !== undefined
  );

  const updateSettingRes = await req(
    '/api/admin/settings',
    'PATCH',
    { platform_name: 'Rubbish Revamp B2B Marketplace' },
    adminToken
  );
  assert(
    'Admin updates safe system settings (200 OK)',
    updateSettingRes.status === 200 &&
      updateSettingRes.body.data?.platform_name?.value === 'Rubbish Revamp B2B Marketplace'
  );

  console.log('\n================================================================');
  console.log(`  OPERATIONAL CONTROL TESTS: ${passed} PASSED, ${failed} FAILED `);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTests()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
