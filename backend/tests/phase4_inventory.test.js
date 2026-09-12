/**
 * tests/phase4_inventory.test.js
 * ------------------------------
 * Automated validation for Phase 4:
 * Test 1: Standard reservation (500kg initial -> 200kg order -> 300kg available, 200kg reserved)
 * Test 2: Insufficient inventory rejection (100kg available -> 200kg order -> rejected)
 * Test 3: Concurrency / Anti-overselling (500kg available -> two concurrent 300kg orders -> exactly 1 succeeds)
 * Test 4: Cancellation / Release (200kg reserved order cancelled -> released to available)
 * Test 5: Delivery / Fulfillment (200kg reserved order delivered -> moved to fulfilled)
 * Test 6: Idempotent cancellation (duplicate cancel requests change inventory only once)
 * Test 7: Idempotent fulfillment (duplicate fulfill requests change inventory only once)
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');
const { pool } = require('../src/config/db');
const inventoryService = require('../src/services/inventoryService');

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
  console.log('==============================================');
  console.log('STARTING PHASE 4 INVENTORY VERIFICATION SUITE');
  console.log('==============================================');

  const buyerUser = { id: 'a1b2c3d4-0003-0000-0000-000000000003', email: 'buyer1@rubbishrevamp.dev', role: 'buyer' };
  const buyerUser2 = { id: 'a1b2c3d4-0004-0000-0000-000000000004', email: 'buyer2@rubbishrevamp.dev', role: 'buyer' };
  const sellerUser = { id: 'dc76280f-addc-11f1-85ec-0a0027000004', email: 'seller1@gmail.com', role: 'seller' };

  const buyerToken = makeToken(buyerUser);
  const buyer2Token = makeToken(buyerUser2);
  const sellerToken = makeToken(sellerUser);

  // Helper to create clean test listing
  async function createTestListing(qty) {
    const id = require('crypto').randomUUID();
    await pool.execute(
      `INSERT INTO waste_listings (
        id, user_id, waste_type, title, description, quantity, available_quantity, reserved_quantity, fulfilled_quantity, unit, price_per_kg, total_price, location, status
      ) VALUES (?, ?, 'Plastic', 'Test Inventory Listing', 'Phase 4 test', ?, ?, 0.00, 0.00, 'kg', 25.00, ?, 'Bangalore', 'Available')`,
      [id, sellerUser.id, qty, qty, qty * 25]
    );
    return id;
  }

  // TEST 1: Inventory = 500 kg, Order = 200 kg -> Available = 300 kg, Reserved = 200 kg
  console.log('\n--- TEST 1: Standard Reservation (500kg -> 200kg) ---');
  const listing1 = await createTestListing(500);
  const res1 = await req('/api/requests', 'POST', {
    listing_id: listing1,
    requested_quantity: 200,
    buyer_message: 'Test 1 order'
  }, buyerToken);

  console.log('POST /api/requests status:', res1.status);
  const inv1 = await inventoryService.getListingInventory(listing1);
  console.log(`Available: ${inv1.available_quantity} (Expected 300), Reserved: ${inv1.reserved_quantity} (Expected 200)`);
  if (inv1.available_quantity === 300 && inv1.reserved_quantity === 200) {
    console.log('✅ TEST 1 PASSED');
  } else {
    throw new Error(`TEST 1 FAILED: Available=${inv1.available_quantity}, Reserved=${inv1.reserved_quantity}`);
  }

  // TEST 2: Inventory = 100 kg, Order = 200 kg -> Reservation rejected
  console.log('\n--- TEST 2: Insufficient Inventory Rejection (100kg -> 200kg) ---');
  const listing2 = await createTestListing(100);
  const res2 = await req('/api/requests', 'POST', {
    listing_id: listing2,
    requested_quantity: 200,
    buyer_message: 'Test 2 order'
  }, buyerToken);

  console.log('POST /api/requests status:', res2.status, 'Message:', res2.body.message);
  const inv2 = await inventoryService.getListingInventory(listing2);
  if (res2.status === 400 && inv2.available_quantity === 100 && inv2.reserved_quantity === 0) {
    console.log('✅ TEST 2 PASSED');
  } else {
    throw new Error(`TEST 2 FAILED: HTTP Status=${res2.status}, Available=${inv2.available_quantity}`);
  }

  // TEST 3: Inventory = 500 kg, Two buyers simultaneously request 300 kg each
  console.log('\n--- TEST 3: Concurrent Requests (500kg, two buyers requesting 300kg each) ---');
  const listing3 = await createTestListing(500);
  const [attempt1, attempt2] = await Promise.all([
    req('/api/requests', 'POST', { listing_id: listing3, requested_quantity: 300, buyer_message: 'Buyer 1 concurrent' }, buyerToken),
    req('/api/requests', 'POST', { listing_id: listing3, requested_quantity: 300, buyer_message: 'Buyer 2 concurrent' }, buyer2Token)
  ]);

  console.log('Buyer 1 status:', attempt1.status, 'Buyer 2 status:', attempt2.status);
  const inv3 = await inventoryService.getListingInventory(listing3);
  console.log(`Available: ${inv3.available_quantity}, Reserved: ${inv3.reserved_quantity}`);

  const oneSucceeded = (attempt1.status === 201 && attempt2.status === 400) || (attempt1.status === 400 && attempt2.status === 201);
  if (oneSucceeded && inv3.available_quantity === 200 && inv3.reserved_quantity === 300) {
    console.log('✅ TEST 3 PASSED (Atomic concurrency prevented overselling)');
  } else {
    throw new Error(`TEST 3 FAILED: Available=${inv3.available_quantity}, Reserved=${inv3.reserved_quantity}`);
  }

  // TEST 4: Reserved order is cancelled -> Released back to available inventory
  console.log('\n--- TEST 4: Order Cancellation / Inventory Release ---');
  const order1Id = res1.body.data?.request?.id;
  const cancelRes = await req('/api/requests/' + order1Id + '/status', 'PATCH', {
    status: 'cancelled',
    note: 'Seller rejects request'
  }, sellerToken);

  console.log('Cancel status:', cancelRes.status);
  const inv4 = await inventoryService.getListingInventory(listing1);
  console.log(`After cancellation - Available: ${inv4.available_quantity} (Expected 500), Reserved: ${inv4.reserved_quantity} (Expected 0)`);
  if (inv4.available_quantity === 500 && inv4.reserved_quantity === 0) {
    console.log('✅ TEST 4 PASSED');
  } else {
    throw new Error(`TEST 4 FAILED: Available=${inv4.available_quantity}, Reserved=${inv4.reserved_quantity}`);
  }

  // TEST 5: Reserved order is delivered -> Reserved quantity moves to fulfilled quantity
  console.log('\n--- TEST 5: Order Delivery / Inventory Fulfillment ---');
  const listing5 = await createTestListing(400);
  const order5Res = await req('/api/requests', 'POST', {
    listing_id: listing5,
    requested_quantity: 150,
    buyer_message: 'Test 5 delivery order'
  }, buyerToken);
  const order5Id = order5Res.body.data?.request?.id;

  // Seller accepts (awaiting_payment) and buyer pays (confirmed)
  await req('/api/requests/' + order5Id + '/status', 'PATCH', { status: 'awaiting_payment' }, sellerToken);
  const payRes = await req('/api/payments', 'POST', { request_id: order5Id }, buyerToken);
  await req('/api/payments/' + payRes.body.data.payment.id + '/mock-success', 'POST', {}, buyerToken);
  // Seller prepares (ready_for_pickup) and ships (in_transit)
  await req('/api/requests/' + order5Id + '/status', 'PATCH', { status: 'ready_for_pickup' }, sellerToken);
  await req('/api/requests/' + order5Id + '/status', 'PATCH', { status: 'in_transit' }, sellerToken);
  // Seller marks delivered
  const deliverRes = await req('/api/requests/' + order5Id + '/status', 'PATCH', { status: 'delivered', note: 'Goods delivered' }, sellerToken);
  console.log('Delivered HTTP status:', deliverRes.status);

  const inv5 = await inventoryService.getListingInventory(listing5);
  console.log(`Available: ${inv5.available_quantity} (Expected 250), Reserved: ${inv5.reserved_quantity} (Expected 0), Fulfilled: ${inv5.fulfilled_quantity} (Expected 150)`);
  if (inv5.available_quantity === 250 && inv5.reserved_quantity === 0 && inv5.fulfilled_quantity === 150) {
    console.log('✅ TEST 5 PASSED');
  } else {
    throw new Error(`TEST 5 FAILED: Available=${inv5.available_quantity}, Reserved=${inv5.reserved_quantity}, Fulfilled=${inv5.fulfilled_quantity}`);
  }

  // TEST 6: Duplicate cancellation sent -> Inventory changes only once
  console.log('\n--- TEST 6: Idempotent Cancellation (Double Release Guard) ---');
  const release2 = await inventoryService.releaseInventory({ orderId: order1Id, actorId: sellerUser.id });
  console.log('Second release result:', release2);
  const inv6 = await inventoryService.getListingInventory(listing1);
  if (release2.released === false && inv6.available_quantity === 500 && inv6.reserved_quantity === 0) {
    console.log('✅ TEST 6 PASSED (Duplicate release safely blocked)');
  } else {
    throw new Error(`TEST 6 FAILED: Available=${inv6.available_quantity}`);
  }

  // TEST 7: Duplicate delivery sent -> Inventory changes only once
  console.log('\n--- TEST 7: Idempotent Fulfillment (Double Fulfillment Guard) ---');
  const fulfill2 = await inventoryService.fulfillInventory({ orderId: order5Id, actorId: sellerUser.id });
  console.log('Second fulfill result:', fulfill2);
  const inv7 = await inventoryService.getListingInventory(listing5);
  if (fulfill2.fulfilled === false && inv7.fulfilled_quantity === 150) {
    console.log('✅ TEST 7 PASSED (Duplicate fulfillment safely blocked)');
  } else {
    throw new Error(`TEST 7 FAILED: Fulfilled=${inv7.fulfilled_quantity}`);
  }

  // TEST 8: Check inventory ledger audit history endpoint
  console.log('\n--- TEST 8: Inventory History Endpoint ---');
  const historyRes = await req('/api/inventory/listings/' + listing5 + '/history', 'GET', null, sellerToken);
  console.log('History HTTP status:', historyRes.status, 'Entries found:', historyRes.body.data?.history?.length);
  historyRes.body.data?.history?.forEach(h => {
    console.log(` - [${h.transaction_type}] Qty: ${h.quantity}kg | Prev: ${h.previous_available_quantity}kg -> Result: ${h.resulting_available_quantity}kg | ${h.note}`);
  });

  if (historyRes.status === 200 && historyRes.body.data?.history?.length >= 2) {
    console.log('✅ TEST 8 PASSED (Ledger audit complete)');
  } else {
    throw new Error('TEST 8 FAILED: Missing history entries');
  }

  console.log('\n==============================================');
  console.log('🎉 ALL PHASE 4 BACKEND INVENTORY TESTS PASSED!');
  console.log('==============================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ TEST SUITE RUN ERROR:', err);
  process.exit(1);
});
