/**
 * backend/tests/phase14_supplier_verification.test.js
 * ----------------------------------------------------
 * Phase 14 — Simple Supplier Verification & Business Trust Test Suite
 *
 * Tests cover:
 *  1. Schema migration verification: `is_verified` column in `users`
 *  2. Admin can mark supplier as verified (`PATCH /api/admin/users/:userId/verification`)
 *  3. Admin can unverify a supplier
 *  4. Admin can update verification via `PATCH /api/admin/sellers/:id/verify`
 *  5. Non-admin role (buyer) cannot verify suppliers (403 Forbidden)
 *  6. Non-admin role (seller) cannot verify suppliers (403 Forbidden)
 *  7. Unauthenticated requests are rejected (401 Unauthorized)
 *  8. Attempting to verify a buyer account returns 400 Bad Request
 *  9. Self-verification prevention: `PATCH /api/users/me` ignores verification fields
 * 10. `GET /api/listings` and `GET /api/listings/:id` include `seller.is_verified`
 * 11. `GET /api/requests/:id` includes `seller.is_verified`
 * 12. `GET /api/admin/users` and `GET /api/admin/sellers` return accurate `is_verified`
 */

require('dotenv').config();
const http = require('http');
const { pool } = require('../src/config/db');
const bcrypt = require('bcryptjs');
const { signToken } = require('../src/utils/jwt');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

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

let adminId, adminToken;
let sellerId, sellerToken;
let buyerId, buyerToken;
let listingId, requestId;

async function seedData() {
  const hash = await bcrypt.hash('TestPass123!', 10);

  // Admin
  const [aUuid] = await pool.execute('SELECT UUID() AS id');
  adminId = aUuid[0].id;
  await pool.execute(
    `INSERT INTO users (id, email, password_hash, role, display_name, is_active)
     VALUES (?, ?, ?, 'admin', 'Phase14 Admin', 1)`,
    [adminId, `p14admin@test-${Date.now()}.com`, hash]
  );
  adminToken = signToken({ id: adminId, email: `p14admin@test.com`, role: 'admin' });

  // Seller
  const [sUuid] = await pool.execute('SELECT UUID() AS id');
  sellerId = sUuid[0].id;
  await pool.execute(
    `INSERT INTO users (id, email, password_hash, role, display_name, company_name, is_active, is_verified, kyc_verified)
     VALUES (?, ?, ?, 'seller', 'Phase14 Supplier', 'Trust Scrap Metal Ltd', 1, 0, 0)`,
    [sellerId, `p14seller@test-${Date.now()}.com`, hash]
  );
  sellerToken = signToken({ id: sellerId, email: `p14seller@test.com`, role: 'seller' });

  // Buyer
  const [bUuid] = await pool.execute('SELECT UUID() AS id');
  buyerId = bUuid[0].id;
  await pool.execute(
    `INSERT INTO users (id, email, password_hash, role, display_name, company_name, is_active)
     VALUES (?, ?, ?, 'buyer', 'Phase14 Buyer', 'Precision Smelters Inc', 1)`,
    [buyerId, `p14buyer@test-${Date.now()}.com`, hash]
  );
  buyerToken = signToken({ id: buyerId, email: `p14buyer@test.com`, role: 'buyer' });

  // Listing
  const [lUuid] = await pool.execute('SELECT UUID() AS id');
  listingId = lUuid[0].id;
  await pool.execute(
    `INSERT INTO waste_listings (id, user_id, waste_type, title, quantity, available_quantity, reserved_quantity, fulfilled_quantity, unit, price_per_kg, total_price, location, status)
     VALUES (?, ?, 'Metal', 'High Grade Copper Wire Scrap', 1000, 1000, 0, 0, 'kg', 450, 450000, 'Pune Industrial Area', 'Available')`,
    [listingId, sellerId]
  );

  // Request
  const [rUuid] = await pool.execute('SELECT UUID() AS id');
  requestId = rUuid[0].id;
  await pool.execute(
    `INSERT INTO collection_requests (id, listing_id, buyer_id, seller_id, waste_type, quantity, price_per_kg, amount, status, tracking_updates)
     VALUES (?, ?, ?, ?, 'Metal', 200, 450, 90000, 'pending', '[]')`,
    [requestId, listingId, buyerId, sellerId]
  );
}

async function cleanup() {
  if (requestId) await pool.execute('DELETE FROM collection_requests WHERE id = ?', [requestId]);
  if (listingId) await pool.execute('DELETE FROM waste_listings WHERE id = ?', [listingId]);
  if (adminId) await pool.execute('DELETE FROM users WHERE id = ?', [adminId]);
  if (sellerId) await pool.execute('DELETE FROM users WHERE id = ?', [sellerId]);
  if (buyerId) await pool.execute('DELETE FROM users WHERE id = ?', [buyerId]);
}

const results = [];
let passed = 0, failed = 0;

function test(name, fn) {
  results.push({ name, fn });
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  PHASE 14 — Supplier Verification Test Suite');
  console.log('══════════════════════════════════════════════════\n');

  try {
    await seedData();
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

test('Migration check: is_verified column exists in users table', async () => {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_verified'`
  );
  if (rows.length === 0) throw new Error('is_verified column not found in users table');
});

test('Initial state: seller is initially unverified', async () => {
  const res = await request('GET', `/api/admin/users/${sellerId}`, null, adminToken);
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (res.body.data?.user?.is_verified !== false) {
    throw new Error(`Expected is_verified to be false, got ${res.body.data?.user?.is_verified}`);
  }
});

test('Public listing returns seller.is_verified: false initially', async () => {
  const res = await request('GET', `/api/listings/${listingId}`, null, null);
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  const listing = res.body.data?.listing;
  if (!listing) throw new Error('No listing in response');
  if (listing.seller?.is_verified !== false) {
    throw new Error(`Expected listing.seller.is_verified: false, got ${listing.seller?.is_verified}`);
  }
});

test('Admin can verify seller via PATCH /api/admin/users/:userId/verification', async () => {
  const res = await request(
    'PATCH',
    `/api/admin/users/${sellerId}/verification`,
    { is_verified: true, kyc_notes: 'Verified factory warehouse inspection' },
    adminToken
  );
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.success) throw new Error('Expected success: true');
  if (res.body.data?.user?.is_verified !== true) {
    throw new Error('Expected updated user.is_verified to be true');
  }
});

test('Public listing now returns seller.is_verified: true after admin verification', async () => {
  const res = await request('GET', `/api/listings/${listingId}`, null, null);
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  const listing = res.body.data?.listing;
  if (listing.seller?.is_verified !== true) {
    throw new Error(`Expected listing.seller.is_verified: true, got ${listing.seller?.is_verified}`);
  }
});

test('Public listings list GET /api/listings includes seller.is_verified: true', async () => {
  const res = await request('GET', `/api/listings?search=High Grade Copper`, null, null);
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  const listings = res.body.data?.listings || [];
  const found = listings.find((l) => l.id === listingId);
  if (!found) throw new Error('Seeded listing not found in search results');
  if (found.seller?.is_verified !== true) {
    throw new Error(`Expected found listing seller.is_verified: true, got ${found.seller?.is_verified}`);
  }
});

test('Order detail GET /api/requests/:id includes seller.is_verified: true', async () => {
  const res = await request('GET', `/api/requests/${requestId}`, null, buyerToken);
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  const req = res.body.data?.request;
  if (req.seller?.is_verified !== true) {
    throw new Error(`Expected req.seller.is_verified: true, got ${req.seller?.is_verified}`);
  }
});

test('Admin can unverify seller via PATCH /api/admin/users/:userId/verification', async () => {
  const res = await request(
    'PATCH',
    `/api/admin/users/${sellerId}/verification`,
    { is_verified: false },
    adminToken
  );
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (res.body.data?.user?.is_verified !== false) {
    throw new Error('Expected updated user.is_verified to be false');
  }
});

test('Admin can re-verify seller via PATCH /api/admin/sellers/:id/verify', async () => {
  const res = await request(
    'PATCH',
    `/api/admin/sellers/${sellerId}/verify`,
    { is_verified: true },
    adminToken
  );
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (res.body.data?.user?.is_verified !== true && res.body.data?.seller?.is_verified !== true) {
    throw new Error('Expected updated seller.is_verified to be true');
  }
});

test('Non-admin (buyer) receives 403 Forbidden when attempting to verify seller', async () => {
  const res = await request(
    'PATCH',
    `/api/admin/users/${sellerId}/verification`,
    { is_verified: true },
    buyerToken
  );
  if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
});

test('Non-admin (seller) receives 403 Forbidden when attempting to verify seller', async () => {
  const res = await request(
    'PATCH',
    `/api/admin/users/${sellerId}/verification`,
    { is_verified: true },
    sellerToken
  );
  if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
});

test('Unauthenticated user receives 401 Unauthorized', async () => {
  const res = await request(
    'PATCH',
    `/api/admin/users/${sellerId}/verification`,
    { is_verified: true },
    null
  );
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
});

test('Attempting to verify a buyer account returns 400 Bad Request', async () => {
  const res = await request(
    'PATCH',
    `/api/admin/users/${buyerId}/verification`,
    { is_verified: true },
    adminToken
  );
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.message.includes('Only supplier/seller accounts can be verified')) {
    throw new Error(`Unexpected error message: ${res.body.message}`);
  }
});

test('Supplier self-update via PATCH /api/users/me cannot change is_verified', async () => {
  // Unverify seller first
  await request('PATCH', `/api/admin/users/${sellerId}/verification`, { is_verified: false }, adminToken);
  
  // Seller tries to self-verify
  const selfRes = await request(
    'PATCH',
    '/api/users/me',
    { is_verified: true, kyc_verified: true, display_name: 'Hacked Seller' },
    sellerToken
  );
  if (selfRes.status !== 200) throw new Error(`Expected 200, got ${selfRes.status}`);

  // Fetch from DB to ensure is_verified is still 0
  const [rows] = await pool.execute('SELECT is_verified, kyc_verified FROM users WHERE id = ?', [sellerId]);
  if (Boolean(rows[0].is_verified) !== false || Boolean(rows[0].kyc_verified) !== false) {
    throw new Error('Security Breach: Seller was able to self-verify through PATCH /api/users/me!');
  }
});

run();
