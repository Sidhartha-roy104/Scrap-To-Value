/**
 * backend/tests/phase13_business_profiles.test.js
 * -------------------------------------------------
 * Phase 13 — Business Profiles, Contact Details & Order Documentation
 *
 * Tests cover:
 *  1. GET  /api/users/me — returns all profile fields including new Phase 13 fields
 *  2. PATCH /api/users/me — updates profile correctly
 *  3. PATCH /api/users/me — rejects unauthorized request (no token)
 *  4. PATCH /api/users/me — enforces field length limits
 *  5. PATCH /api/users/me — allows partial updates (only provided fields changed)
 *  6. PATCH /api/users/me — allows clearing fields to null
 *  7. GET /api/requests/:id — includes buyer and seller contact details (authorized)
 *  8. GET /api/requests/:id — buyers see their own orders
 *  9. GET /api/requests/:id — sellers see their own orders
 * 10. Regression: Phase 13 migration columns exist in users table
 */

require('dotenv').config();
const http = require('http');
const { pool } = require('../src/config/db');
const bcrypt = require('bcryptjs');
const { signToken } = require('../src/utils/jwt');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// ─── Helpers ───────────────────────────────────────────────────────────────

async function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let buyerToken, sellerId, buyerId, sellerId2, sellerToken, requestId;

async function seedUsers() {
  const hash = await bcrypt.hash('TestPass123!', 10);

  // Buyer
  const [bUuidRow] = await pool.execute('SELECT UUID() AS id');
  buyerId = bUuidRow[0].id;
  await pool.execute(
    `INSERT INTO users (id, email, password_hash, role, display_name, company_name, phone, is_active)
     VALUES (?, ?, ?, 'buyer', 'Phase13 Buyer', 'Green Recyclers Pvt Ltd', '+91 9000000001', 1)`,
    [buyerId, `p13buyer@test-${Date.now()}.com`, hash]
  );
  buyerToken = signToken({ id: buyerId, email: `p13buyer@test.com`, role: 'buyer' });

  // Seller
  const [sUuidRow] = await pool.execute('SELECT UUID() AS id');
  sellerId = sUuidRow[0].id;
  await pool.execute(
    `INSERT INTO users (id, email, password_hash, role, display_name, company_name, phone, is_active)
     VALUES (?, ?, ?, 'seller', 'Phase13 Seller', 'Metal Fab Industries', '+91 9000000002', 1)`,
    [sellerId, `p13seller@test-${Date.now()}.com`, hash]
  );
  sellerToken = signToken({ id: sellerId, email: `p13seller@test.com`, role: 'seller' });
}

async function seedListing() {
  const [uuidRow] = await pool.execute('SELECT UUID() AS id');
  const listingId = uuidRow[0].id;
  await pool.execute(
    `INSERT INTO waste_listings (id, user_id, waste_type, title, quantity, available_quantity, reserved_quantity, fulfilled_quantity, unit, price_per_kg, total_price, location, status)
     VALUES (?, ?, 'Metal', 'Phase13 Test Listing', 500, 500, 0, 0, 'kg', 30, 15000, 'Chennai', 'Available')`,
    [listingId, sellerId]
  );
  return listingId;
}

async function seedRequest(listingId) {
  const [uuidRow] = await pool.execute('SELECT UUID() AS id');
  requestId = uuidRow[0].id;
  const tracking = JSON.stringify([{ status: 'delivered', timestamp: new Date().toISOString(), note: 'Phase13 test order' }]);
  await pool.execute(
    `INSERT INTO collection_requests (id, listing_id, buyer_id, seller_id, waste_type, quantity, price_per_kg, amount, buyer_message, status, tracking_updates)
     VALUES (?, ?, ?, ?, 'Metal', 100, 30, 3000, 'Phase13 test order note', 'delivered', ?)`,
    [requestId, listingId, buyerId, sellerId, tracking]
  );
  return requestId;
}

async function cleanup() {
  if (requestId) await pool.execute('DELETE FROM collection_requests WHERE id = ?', [requestId]);
  if (buyerId) await pool.execute('DELETE FROM users WHERE id = ?', [buyerId]);
  if (sellerId) await pool.execute('DELETE FROM users WHERE id = ?', [sellerId]);
}

// ─── Tests ─────────────────────────────────────────────────────────────────

const results = [];
let passed = 0, failed = 0;

function test(name, fn) {
  results.push({ name, fn });
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  PHASE 13 — Business Profiles Test Suite');
  console.log('══════════════════════════════════════════════════\n');

  try {
    await seedUsers();
    const listingId = await seedListing();
    await seedRequest(listingId);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    await cleanup();
    process.exit(1);
  }

  for (const { name, fn } of results) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ${name}`);
      console.error(`     ${err.message}`);
      failed++;
    }
  }

  await cleanup();
  await pool.end();

  console.log(`\n──────────────────────────────────────────────────`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`──────────────────────────────────────────────────\n`);
  process.exit(failed > 0 ? 1 : 0);
}

// ─── Test Definitions ──────────────────────────────────────────────────────

test('Phase 13 migration: city column exists in users', async () => {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'city'`
  );
  if (rows.length === 0) throw new Error('city column not found in users table');
});

test('Phase 13 migration: state column exists in users', async () => {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'state'`
  );
  if (rows.length === 0) throw new Error('state column not found in users table');
});

test('Phase 13 migration: company_type column exists in users', async () => {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'company_type'`
  );
  if (rows.length === 0) throw new Error('company_type column not found in users table');
});

test('Phase 13 migration: company_description column exists in users', async () => {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'company_description'`
  );
  if (rows.length === 0) throw new Error('company_description column not found in users table');
});

test('GET /api/users/me — returns user with Phase 13 fields', async () => {
  const res = await request('GET', '/api/users/me', null, buyerToken);
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body.success) throw new Error('Response not successful');
  const u = res.body.data?.user;
  if (!u) throw new Error('No user in response');
  if (!('city' in u)) throw new Error('city field missing in response');
  if (!('state' in u)) throw new Error('state field missing in response');
  if (!('company_type' in u)) throw new Error('company_type field missing in response');
  if (!('company_description' in u)) throw new Error('company_description field missing in response');
});

test('GET /api/users/me — requires authentication', async () => {
  const res = await request('GET', '/api/users/me', null, null);
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
});

test('PATCH /api/users/me — updates profile fields correctly', async () => {
  const payload = {
    display_name: 'Phase13 Updated Buyer',
    company_name: 'Updated Recyclers Pvt Ltd',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    company_type: 'Recycling Company',
    company_description: 'Leading scrap buyer in Tamil Nadu.',
  };
  const res = await request('PATCH', '/api/users/me', payload, buyerToken);
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  const u = res.body.data?.user;
  if (!u) throw new Error('No user in response');
  if (u.full_name !== payload.display_name) throw new Error(`display_name not updated. Got: ${u.full_name}`);
  if (u.city !== payload.city) throw new Error(`city not updated. Got: ${u.city}`);
  if (u.state !== payload.state) throw new Error(`state not updated. Got: ${u.state}`);
  if (u.company_type !== payload.company_type) throw new Error(`company_type not updated. Got: ${u.company_type}`);
  if (u.company_description !== payload.company_description) throw new Error(`company_description not updated`);
});

test('PATCH /api/users/me — persisted to DB (verify via GET)', async () => {
  const res = await request('GET', '/api/users/me', null, buyerToken);
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  const u = res.body.data?.user;
  if (u.city !== 'Chennai') throw new Error(`city not persisted. Got: ${u.city}`);
  if (u.company_type !== 'Recycling Company') throw new Error(`company_type not persisted. Got: ${u.company_type}`);
});

test('PATCH /api/users/me — requires authentication', async () => {
  const res = await request('PATCH', '/api/users/me', { display_name: 'Hacker' }, null);
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
});

test('PATCH /api/users/me — partial update only changes provided fields', async () => {
  // First set known state
  await request('PATCH', '/api/users/me', { city: 'Coimbatore', company_type: 'Metal Foundry / Smelter' }, sellerToken);
  // Now partial update only company_type
  await request('PATCH', '/api/users/me', { company_type: 'Metal Foundry / Smelter' }, sellerToken);
  const res = await request('GET', '/api/users/me', null, sellerToken);
  const u = res.body.data?.user;
  // City should still be Coimbatore (not erased by partial update)
  if (u.city !== 'Coimbatore') throw new Error(`Partial update erased city. Got: ${u.city}`);
});

test('PATCH /api/users/me — enforces company_description max length', async () => {
  const longText = 'A'.repeat(501);
  const res = await request('PATCH', '/api/users/me', { company_description: longText }, buyerToken);
  if (res.status !== 422) throw new Error(`Expected 422 validation error, got ${res.status}`);
});

test('PATCH /api/users/me — does not update email', async () => {
  // Even if email is in body, it must be ignored
  const res = await request('PATCH', '/api/users/me', { email: 'hacked@evil.com', display_name: 'Safe' }, buyerToken);
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  const u = res.body.data?.user;
  if (u.email === 'hacked@evil.com') throw new Error('Email was updated — security violation!');
});

test('PATCH /api/users/me — can clear optional fields to null by sending empty string', async () => {
  await request('PATCH', '/api/users/me', { city: 'Mumbai' }, buyerToken);
  const clearRes = await request('PATCH', '/api/users/me', { city: '' }, buyerToken);
  if (clearRes.status !== 200) throw new Error(`Expected 200, got ${clearRes.status}`);
  const u = clearRes.body.data?.user;
  if (u.city !== null) throw new Error(`city should be null after clearing. Got: ${u.city}`);
});

test('GET /api/requests/:id — delivers buyer and seller contact in order detail', async () => {
  const res = await request('GET', `/api/requests/${requestId}`, null, buyerToken);
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  const req = res.body.data?.request;
  if (!req) throw new Error('No request in response');
  if (!req.seller) throw new Error('seller details missing in order detail');
  if (!req.buyer) throw new Error('buyer details missing in order detail');
  if (!req.seller.name) throw new Error('seller.name missing');
  if (!req.buyer.name) throw new Error('buyer.name missing');
});

test('GET /api/requests/:id — buyer_message preserved in order detail', async () => {
  const res = await request('GET', `/api/requests/${requestId}`, null, buyerToken);
  const req = res.body.data?.request;
  if (!req) throw new Error('No request in response');
  if (req.buyer_message !== 'Phase13 test order note') {
    throw new Error(`buyer_message mismatch. Got: ${req.buyer_message}`);
  }
});

run();
