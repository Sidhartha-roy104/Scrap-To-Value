/**
 * tests/buyer_procurement_request_flow.test.js
 * -------------------------------------------
 * Automated regression test for Buyer Procurement Request Submission Flow:
 * Test 1: Unauthenticated request is rejected (401 Unauthorized)
 * Test 2: Seller role request is rejected (403 Forbidden: Only buyers can request scrap listings)
 * Test 3: Admin role request is rejected (403 Forbidden: Only buyers can request scrap listings)
 * Test 4: Quantity <= 0 is rejected (400 Bad Request)
 * Test 5: Quantity > available_quantity is rejected (400 Insufficient Inventory)
 * Test 6: Valid Buyer request succeeds (201 Created), status is 'pending', reservation is active
 * Test 7: Clean-up test data
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');
const crypto = require('crypto');
const { pool } = require('../src/config/db');

const jwtSecret = process.env.JWT_SECRET || 'your-default-jwt-secret-replace-in-production';

function makeToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '1h' });
}

function req(path, method, data, token) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : '';
    const r = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(payload);
    r.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('STARTING BUYER PROCUREMENT REQUEST FLOW REGRESSION SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  const testSupplierId = 'dc76280f-addc-11f1-85ec-0a0027000004';
  const testBuyerId = 'a1b2c3d4-0003-0000-0000-000000000003';
  const testAdminId = 'a1b2c3d4-0001-0000-0000-000000000001';
  const testListingId = crypto.randomUUID();
  let createdRequestId = null;

  try {
    await pool.execute(
      `INSERT INTO waste_listings (
        id, user_id, waste_type, title, description, quantity, available_quantity, reserved_quantity, fulfilled_quantity, unit, price_per_kg, total_price, location, status
      ) VALUES (?, ?, 'Metal', 'Industrial Copper Offcuts', 'Testing procurement flow', 150.00, 150.00, 0.00, 0.00, 'kg', 40.00, 6000.00, 'Industrial Estate Hub 4', 'Available')`,
      [testListingId, testSupplierId]
    );

    const supplierToken = makeToken({ id: testSupplierId, email: 'seller1@gmail.com', role: 'seller' });
    const buyerToken = makeToken({ id: testBuyerId, email: 'buyer1@rubbishrevamp.dev', role: 'buyer' });
    const adminToken = makeToken({ id: testAdminId, email: 'admin@rubbishrevamp.dev', role: 'admin' });

    // Test 1: Unauthenticated request is rejected (401)
    console.log('[Test 1] Unauthenticated procurement request rejection...');
    const t1 = await req('/api/requests', 'POST', {
      listing_id: testListingId,
      requested_quantity: 51,
    }, null);

    if (t1.status === 401) {
      console.log('  PASS: Rejected with 401 Unauthorized');
      passed++;
    } else {
      console.error('  FAIL: Expected 401, got', t1.status, t1.body);
      failed++;
    }

    // Test 2: Seller role request is rejected (403)
    console.log('\n[Test 2] Supplier (seller) role rejection...');
    const t2 = await req('/api/requests', 'POST', {
      listing_id: testListingId,
      requested_quantity: 51,
    }, supplierToken);

    if (t2.status === 403 && t2.body.message && t2.body.message.includes('Only buyers')) {
      console.log('  PASS: Rejected with 403 Forbidden:', t2.body.message);
      passed++;
    } else {
      console.error('  FAIL: Expected 403 Forbidden with buyer message, got', t2.status, t2.body);
      failed++;
    }

    // Test 3: Admin role request is rejected (403)
    console.log('\n[Test 3] Admin role rejection...');
    const t3 = await req('/api/requests', 'POST', {
      listing_id: testListingId,
      requested_quantity: 51,
    }, adminToken);

    if (t3.status === 403 && t3.body.message && t3.body.message.includes('Only buyers')) {
      console.log('  PASS: Rejected with 403 Forbidden:', t3.body.message);
      passed++;
    } else {
      console.error('  FAIL: Expected 403 Forbidden with buyer message, got', t3.status, t3.body);
      failed++;
    }

    // Test 4: Quantity <= 0 is rejected (400)
    console.log('\n[Test 4] Quantity <= 0 rejection...');
    const t4 = await req('/api/requests', 'POST', {
      listing_id: testListingId,
      requested_quantity: 0,
    }, buyerToken);

    if (t4.status === 400) {
      console.log('  PASS: Rejected with 400 Bad Request:', t4.body.message);
      passed++;
    } else {
      console.error('  FAIL: Expected 400, got', t4.status, t4.body);
      failed++;
    }

    // Test 5: Quantity > available_quantity is rejected (400)
    console.log('\n[Test 5] Quantity exceeding available quantity rejection...');
    const t5 = await req('/api/requests', 'POST', {
      listing_id: testListingId,
      requested_quantity: 200, // available is 150
    }, buyerToken);

    if (t5.status === 400 && t5.body.message && t5.body.message.includes('Only 150')) {
      console.log('  PASS: Rejected with 400 and available quantity message:', t5.body.message);
      passed++;
    } else {
      console.error('  FAIL: Expected 400 with available quantity info, got', t5.status, t5.body);
      failed++;
    }

    // Test 6: Valid Buyer request succeeds (201 Created)
    console.log('\n[Test 6] Valid Buyer procurement request submission...');
    const t6 = await req('/api/requests', 'POST', {
      listing_id: testListingId,
      requested_quantity: 51,
      buyer_message: 'Need prompt delivery for manufacturing line 2.',
    }, buyerToken);

    if (t6.status === 201 && t6.body.success && t6.body.data && t6.body.data.request) {
      const r = t6.body.data.request;
      createdRequestId = r.id;

      if (r.status === 'pending' && r.quantity === 51 && r.amount === 2040) {
        console.log(`  PASS: Request created with ID=${r.id}, status=${r.status}, quantity=${r.quantity}kg, amount=₹${r.amount}`);
        passed++;
      } else {
        console.error('  FAIL: Request values mismatched:', r);
        failed++;
      }

      // Check listing inventory update
      const [listingRows] = await pool.execute('SELECT available_quantity, reserved_quantity FROM waste_listings WHERE id = ?', [testListingId]);
      const l = listingRows[0];
      if (parseFloat(l.available_quantity) === 99 && parseFloat(l.reserved_quantity) === 51) {
        console.log(`  PASS: Listing inventory updated: available=${l.available_quantity}kg, reserved=${l.reserved_quantity}kg`);
        passed++;
      } else {
        console.error('  FAIL: Listing inventory not updated correctly:', l);
        failed++;
      }

      // Check notification sent to supplier
      const [notifs] = await pool.execute('SELECT * FROM notifications WHERE recipient_id = ? AND related_request_id = ?', [testSupplierId, createdRequestId]);
      if (notifs.length > 0) {
        console.log(`  PASS: Notification generated for supplier: "${notifs[0].title}"`);
        passed++;
      } else {
        console.error('  FAIL: Notification not generated for supplier');
        failed++;
      }
    } else {
      console.error('  FAIL: Request creation failed:', t6.status, t6.body);
      failed++;
    }

  } catch (err) {
    console.error('Unexpected error during suite:', err);
    failed++;
  } finally {
    // Clean up
    console.log('\nCleaning up test artifacts...');
    try {
      if (createdRequestId) {
        await pool.execute('DELETE FROM notifications WHERE related_request_id = ?', [createdRequestId]);
        await pool.execute('DELETE FROM inventory_transactions WHERE order_id = ?', [createdRequestId]);
        await pool.execute('DELETE FROM inventory_reservations WHERE order_id = ?', [createdRequestId]);
        await pool.execute('DELETE FROM collection_requests WHERE id = ?', [createdRequestId]);
      }
      await pool.execute('DELETE FROM waste_listings WHERE id = ?', [testListingId]);
      console.log('Cleanup completed successfully.');
    } catch (e) {
      console.error('Cleanup error:', e.message);
    }
  }

  console.log('\n========================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
