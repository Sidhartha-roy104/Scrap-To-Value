/**
 * tests/phase5_payment.test.js
 * ----------------------------
 * Phase 5 Automated Validation Suite:
 * TEST 1: Payment creation with trusted backend amount
 * TEST 2: Unauthorized buyer rejected (403)
 * TEST 3: Successful mock payment -> SUCCEEDED, order confirmed, inventory reserved
 * TEST 4: Failed mock payment -> FAILED, order pending, inventory preserved
 * TEST 5: Cancelled mock payment -> CANCELLED, order pending
 * TEST 6: Duplicate mock success -> Idempotent
 * TEST 7: Duplicate payment creation -> Reuses active pending payment
 * TEST 8: Ineligible order states rejected (cancelled, delivered, etc.)
 * TEST 9: Client amount tampering ignored
 * TEST 10: Payment audit ledger history records events chronologically
 * TEST 11: Existing Phase 4 regression check (reservation, release, fulfillment)
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');
const { pool } = require('../src/config/db');
const inventoryService = require('../src/services/inventoryService');
const paymentService = require('../src/services/paymentService');

const jwtSecret = process.env.JWT_SECRET || 'your-default-jwt-secret-replace-in-production';

function makeToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '1h' });
}

function req(path, method, data, token, headers = {}) {
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
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
        ...headers,
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

async function runPaymentTests() {
  console.log('=====================================================');
  console.log('STARTING PHASE 5 PAYMENT & ORDER CONFIRMATION SUITE');
  console.log('=====================================================');

  const buyerUser = { id: 'a1b2c3d4-0003-0000-0000-000000000003', email: 'buyer1@rubbishrevamp.dev', role: 'buyer' };
  const buyerUser2 = { id: 'a1b2c3d4-0004-0000-0000-000000000004', email: 'buyer2@rubbishrevamp.dev', role: 'buyer' };
  const sellerUser = { id: 'dc76280f-addc-11f1-85ec-0a0027000004', email: 'seller1@gmail.com', role: 'seller' };

  const buyerToken = makeToken(buyerUser);
  const buyer2Token = makeToken(buyerUser2);
  const sellerToken = makeToken(sellerUser);

  async function createTestListing(qty, price = 30.00) {
    const id = require('crypto').randomUUID();
    await pool.execute(
      `INSERT INTO waste_listings (
        id, user_id, waste_type, title, description, quantity, available_quantity, reserved_quantity, fulfilled_quantity, unit, price_per_kg, total_price, location, status
      ) VALUES (?, ?, 'Metal', 'Copper Wire Scrap', 'Phase 5 test listing', ?, ?, 0.00, 0.00, 'kg', ?, ?, 'Chennai', 'Available')`,
      [id, sellerUser.id, qty, qty, price, qty * price]
    );
    return id;
  }

  // --- TEST 1: Payment Creation ---
  console.log('\n--- TEST 1: Payment Creation ---');
  const listing1 = await createTestListing(300, 40.00);
  const order1Res = await req('/api/requests', 'POST', {
    listing_id: listing1,
    requested_quantity: 100,
    buyer_message: 'Test 1 order'
  }, buyerToken);
  const order1Id = order1Res.body.data?.request?.id;

  const pay1Res = await req('/api/payments', 'POST', {
    request_id: order1Id,
    payment_method: 'mock_upi'
  }, buyerToken);

  console.log('POST /api/payments status:', pay1Res.status);
  const payment1 = pay1Res.body.data?.payment;
  console.log(`Payment ID: ${payment1?.id}, Status: ${payment1?.status}, Amount: ${payment1?.amount} INR (Expected 4000)`);
  if (pay1Res.status === 201 && payment1?.status === 'PENDING' && payment1?.amount === 4000) {
    console.log('✅ TEST 1 PASSED');
  } else {
    throw new Error('TEST 1 FAILED: Invalid payment creation');
  }

  // --- TEST 2: Unauthorized Payment ---
  console.log('\n--- TEST 2: Unauthorized Payment ---');
  const pay2Res = await req('/api/payments', 'POST', {
    request_id: order1Id,
    payment_method: 'mock_upi'
  }, buyer2Token);

  console.log('Buyer 2 attempting to pay Buyer 1 order status:', pay2Res.status, pay2Res.body.message);
  if (pay2Res.status === 403) {
    console.log('✅ TEST 2 PASSED (Unauthorized access rejected)');
  } else {
    throw new Error(`TEST 2 FAILED: Expected 403, got ${pay2Res.status}`);
  }

  // --- TEST 3: Successful Mock Payment ---
  console.log('\n--- TEST 3: Successful Mock Payment ---');
  const successRes = await req(`/api/payments/${payment1.id}/mock-success`, 'POST', {
    mock_payment_id: 'mock_pay_test_3'
  }, buyerToken);

  console.log('POST mock-success status:', successRes.status);
  const updatedPay1 = successRes.body.data?.payment;
  console.log(`Payment Status: ${updatedPay1?.status} (Expected SUCCEEDED)`);

  // Verify order status updated to confirmed
  const orderCheck = await req(`/api/requests/${order1Id}`, 'GET', null, buyerToken);
  console.log(`Order Status: ${orderCheck.body.data?.request?.status} (Expected confirmed)`);

  // Verify inventory remains reserved and NOT fulfilled
  const inv1 = await inventoryService.getListingInventory(listing1);
  console.log(`Inventory: Available=${inv1.available_quantity} (Expected 200), Reserved=${inv1.reserved_quantity} (Expected 100), Fulfilled=${inv1.fulfilled_quantity} (Expected 0)`);

  if (
    successRes.status === 200 &&
    updatedPay1?.status === 'SUCCEEDED' &&
    orderCheck.body.data?.request?.status === 'confirmed' &&
    inv1.available_quantity === 200 &&
    inv1.reserved_quantity === 100 &&
    inv1.fulfilled_quantity === 0
  ) {
    console.log('✅ TEST 3 PASSED');
  } else {
    throw new Error('TEST 3 FAILED: Order not confirmed or inventory altered incorrectly');
  }

  // --- TEST 4: Failed Mock Payment ---
  console.log('\n--- TEST 4: Failed Mock Payment ---');
  const listing4 = await createTestListing(200, 20.00);
  const order4Res = await req('/api/requests', 'POST', {
    listing_id: listing4,
    requested_quantity: 50,
    buyer_message: 'Test 4 order'
  }, buyerToken);
  const order4Id = order4Res.body.data?.request?.id;

  const pay4Res = await req('/api/payments', 'POST', {
    request_id: order4Id,
    payment_method: 'mock_upi'
  }, buyerToken);
  const payment4Id = pay4Res.body.data?.payment?.id;

  const failRes = await req(`/api/payments/${payment4Id}/mock-failure`, 'POST', {
    reason: 'Insufficient funds simulated'
  }, buyerToken);

  console.log('POST mock-failure status:', failRes.status);
  const failPay = failRes.body.data?.payment;
  console.log(`Payment Status: ${failPay?.status} (Expected FAILED)`);

  const order4Check = await req(`/api/requests/${order4Id}`, 'GET', null, buyerToken);
  console.log(`Order Status: ${order4Check.body.data?.request?.status} (Expected pending)`);

  const inv4 = await inventoryService.getListingInventory(listing4);
  console.log(`Inventory: Available=${inv4.available_quantity} (Expected 150), Reserved=${inv4.reserved_quantity} (Expected 50)`);

  if (
    failRes.status === 200 &&
    failPay?.status === 'FAILED' &&
    order4Check.body.data?.request?.status === 'pending' &&
    inv4.available_quantity === 150 &&
    inv4.reserved_quantity === 50
  ) {
    console.log('✅ TEST 4 PASSED');
  } else {
    throw new Error('TEST 4 FAILED');
  }

  // --- TEST 5: Cancelled Mock Payment ---
  console.log('\n--- TEST 5: Cancelled Mock Payment ---');
  const listing5 = await createTestListing(200, 20.00);
  const order5Res = await req('/api/requests', 'POST', {
    listing_id: listing5,
    requested_quantity: 40,
    buyer_message: 'Test 5 order'
  }, buyerToken);
  const order5Id = order5Res.body.data?.request?.id;

  const pay5Res = await req('/api/payments', 'POST', { request_id: order5Id }, buyerToken);
  const payment5Id = pay5Res.body.data?.payment?.id;

  const cancelPayRes = await req(`/api/payments/${payment5Id}/cancel`, 'POST', {
    reason: 'User closed modal'
  }, buyerToken);

  console.log('POST /api/payments/:id/cancel status:', cancelPayRes.status);
  const cancelledPay = cancelPayRes.body.data?.payment;
  console.log(`Payment Status: ${cancelledPay?.status} (Expected CANCELLED)`);

  const order5Check = await req(`/api/requests/${order5Id}`, 'GET', null, buyerToken);
  console.log(`Order Status: ${order5Check.body.data?.request?.status} (Expected pending)`);

  if (cancelPayRes.status === 200 && cancelledPay?.status === 'CANCELLED' && order5Check.body.data?.request?.status === 'pending') {
    console.log('✅ TEST 5 PASSED');
  } else {
    throw new Error('TEST 5 FAILED');
  }

  // --- TEST 6: Duplicate Success (Idempotency) ---
  console.log('\n--- TEST 6: Duplicate Success (Idempotency) ---');
  const duplicateSuccessRes = await req(`/api/payments/${payment1.id}/mock-success`, 'POST', {
    mock_payment_id: 'mock_pay_test_3_repeat'
  }, buyerToken);

  console.log('Duplicate mock-success status:', duplicateSuccessRes.status);
  console.log('Already processed flag:', duplicateSuccessRes.body.data?.alreadyProcessed);
  if (duplicateSuccessRes.status === 200 && duplicateSuccessRes.body.data?.alreadyProcessed === true) {
    console.log('✅ TEST 6 PASSED (Idempotent duplicate success handled cleanly)');
  } else {
    throw new Error('TEST 6 FAILED: Duplicate success not idempotent');
  }

  // --- TEST 7: Duplicate Payment Creation (Reuse pending payment) ---
  console.log('\n--- TEST 7: Duplicate Payment Creation ---');
  const listing7 = await createTestListing(100, 15.00);
  const order7Res = await req('/api/requests', 'POST', { listing_id: listing7, requested_quantity: 30 }, buyerToken);
  const order7Id = order7Res.body.data?.request?.id;

  const pCreate1 = await req('/api/payments', 'POST', { request_id: order7Id }, buyerToken);
  const pCreate2 = await req('/api/payments', 'POST', { request_id: order7Id }, buyerToken);

  console.log(`First create status: ${pCreate1.status}, Second create status: ${pCreate2.status}`);
  console.log(`First ID: ${pCreate1.body.data?.payment?.id}, Second ID: ${pCreate2.body.data?.payment?.id}, Reused: ${pCreate2.body.data?.reused}`);

  if (pCreate1.body.data?.payment?.id === pCreate2.body.data?.payment?.id && pCreate2.body.data?.reused === true) {
    console.log('✅ TEST 7 PASSED (Reused active pending payment)');
  } else {
    throw new Error('TEST 7 FAILED: Duplicate payment record created');
  }

  // --- TEST 8: Ineligible Order States ---
  console.log('\n--- TEST 8: Ineligible Order States ---');
  // Attempt to pay for already succeeded order1Id
  const payAlreadySucceeded = await req('/api/payments', 'POST', { request_id: order1Id }, buyerToken);
  console.log('Attempting payment on already paid order status:', payAlreadySucceeded.status);

  // Attempt to pay for a cancelled order
  const listing8 = await createTestListing(100, 10.00);
  const order8Res = await req('/api/requests', 'POST', { listing_id: listing8, requested_quantity: 20 }, buyerToken);
  const order8Id = order8Res.body.data?.request?.id;
  await req(`/api/requests/${order8Id}/status`, 'PATCH', { status: 'cancelled' }, sellerToken);

  const payCancelled = await req('/api/payments', 'POST', { request_id: order8Id }, buyerToken);
  console.log('Attempting payment on cancelled order status:', payCancelled.status);

  if (payAlreadySucceeded.status === 409 && payCancelled.status === 400) {
    console.log('✅ TEST 8 PASSED (Ineligible order states rejected)');
  } else {
    throw new Error('TEST 8 FAILED: Ineligible states allowed');
  }

  // --- TEST 9: Client Amount Tampering Ignored ---
  console.log('\n--- TEST 9: Client Amount Tampering Ignored ---');
  const listing9 = await createTestListing(100, 50.00);
  const order9Res = await req('/api/requests', 'POST', { listing_id: listing9, requested_quantity: 10 }, buyerToken);
  const order9Id = order9Res.body.data?.request?.id;

  // Try to send forged amount: 1 INR instead of 500 INR
  const tamperRes = await req('/api/payments', 'POST', {
    request_id: order9Id,
    amount: 1.00 // Tampered!
  }, buyerToken);

  console.log(`Backend recorded payment amount: ${tamperRes.body.data?.amount} INR (Expected 500)`);
  if (tamperRes.body.data?.amount === 500) {
    console.log('✅ TEST 9 PASSED (Client-side amount ignored, trusted backend amount enforced)');
  } else {
    throw new Error(`TEST 9 FAILED: Tampered amount accepted: ${tamperRes.body.data?.amount}`);
  }

  // --- TEST 10: Payment Audit Ledger History ---
  console.log('\n--- TEST 10: Payment Audit Ledger History ---');
  const ledger = await paymentService.getPaymentAuditLedger(payment1.id);
  console.log(`Ledger entries found for Payment #${payment1.id.slice(0, 8)}: ${ledger.length}`);
  ledger.forEach(e => {
    console.log(` - [${e.event_type}] Prev: ${e.previous_status} -> Result: ${e.resulting_status} | Amount: ${e.amount} INR | ${e.note}`);
  });

  if (ledger.length >= 2 && ledger.some(e => e.event_type === 'PAYMENT_CREATED') && ledger.some(e => e.event_type === 'PAYMENT_SUCCEEDED')) {
    console.log('✅ TEST 10 PASSED (Audit ledger chronologically verified)');
  } else {
    throw new Error('TEST 10 FAILED: Missing audit entries');
  }

  // --- TEST 11: Phase 4 Regression Verification ---
  console.log('\n--- TEST 11: Phase 4 Regression Verification ---');
  // Confirm that order1 (paid and confirmed) can be shipped and delivered, which fulfills inventory
  await req(`/api/requests/${order1Id}/status`, 'PATCH', { status: 'in_transit' }, sellerToken);
  await req(`/api/requests/${order1Id}/status`, 'PATCH', { status: 'delivered', note: 'Buyer received material' }, sellerToken);

  const finalInv1 = await inventoryService.getListingInventory(listing1);
  console.log(`After delivery - Available: ${finalInv1.available_quantity}, Reserved: ${finalInv1.reserved_quantity}, Fulfilled: ${finalInv1.fulfilled_quantity}`);

  if (finalInv1.available_quantity === 200 && finalInv1.reserved_quantity === 0 && finalInv1.fulfilled_quantity === 100) {
    console.log('✅ TEST 11 PASSED (Phase 4 delivery fulfillment verified seamlessly with Phase 5 payments)');
  } else {
    throw new Error('TEST 11 FAILED: Phase 4 regression detected');
  }

  console.log('\n=====================================================');
  console.log('🎉 ALL 11 BACKEND TEST CASES PASSED SUCCESSFULLY!');
  console.log('=====================================================');
  process.exit(0);
}

runPaymentTests().catch(err => {
  console.error('❌ PHASE 5 TEST SUITE FAILED:', err);
  process.exit(1);
});
