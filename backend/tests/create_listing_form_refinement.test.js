/**
 * backend/tests/create_listing_form_refinement.test.js
 * ----------------------------------------------------
 * Test suite for UI Refinement — Create Scrap Listing Form
 *
 * Verifies:
 *  1. Database schema: `country`, `state`, `district`, `city` columns exist in `waste_listings`
 *  2. Scrap Material Name (`title`) is required, trimmed, and persisted correctly
 *  3. Structured location fields (country, state, district, city) are stored and returned
 *  4. Automatic combined `location` string construction from structured fields
 *  5. Rejection of empty or invalid Scrap Material Name (< 3 or > 150 chars)
 *  6. Rejection of missing location (when neither location nor city/state provided)
 *  7. Listing updates with new Material Name and structured location fields
 *  8. Dynamic recomputation of combined location string on PATCH
 *  9. Backwards compatibility: listings with only legacy location string still function
 * 10. Coordinates co-exist smoothly with structured location data
 */

require('dotenv').config();
const http = require('http');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');
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

let passed = 0;
let failed = 0;

function assert(condition, name, details = '') {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name} ${details ? `— ${details}` : ''}`);
    failed++;
  }
}

async function createTestUser(role, email) {
  const id = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash('TestPass123!', 10);
  await pool.execute(
    `INSERT INTO users (id, email, password_hash, role, display_name, company_name)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)`,
    [id, email, hashedPassword, role, `Test ${role}`, `Test ${role} Co.`]
  );
  return { id, token: signToken({ id, email, role }) };
}

async function run() {
  console.log('\n======================================================');
  console.log('TEST SUITE: Create Scrap Listing Form Refinements');
  console.log('======================================================\n');

  const seller = await createTestUser('seller', `refine_seller_${Date.now()}@test.com`);
  let createdListingId = null;

  try {
    // 1. Schema check
    console.log('--- Database Schema Verification ---');
    const [cols] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'waste_listings'
       AND COLUMN_NAME IN ('country', 'state', 'district', 'city')`
    );
    assert(cols.some((c) => c.COLUMN_NAME === 'country'), 'Column `country` exists in `waste_listings`');
    assert(cols.some((c) => c.COLUMN_NAME === 'state'), 'Column `state` exists in `waste_listings`');
    assert(cols.some((c) => c.COLUMN_NAME === 'district'), 'Column `district` exists in `waste_listings`');
    assert(cols.some((c) => c.COLUMN_NAME === 'city'), 'Column `city` exists in `waste_listings`');

    // 2. Listing Creation with Scrap Material Name & Structured Location
    console.log('\n--- Listing Creation with Structured Location ---');
    const createRes = await request(
      'POST',
      '/api/listings',
      {
        title: 'Aluminium Extrusion Scrap 6063 Grade',
        waste_type: 'Metal',
        quantity: 1200,
        price_per_kg: 185.5,
        country: 'India',
        state: 'Tamil Nadu',
        district: 'Chennai',
        city: 'Guindy Industrial Estate',
        location: 'Guindy Industrial Estate, Chennai, Tamil Nadu, India',
        latitude: 13.0067,
        longitude: 80.2023,
        description: 'Clean profile cuttings from architectural fabrication.',
      },
      seller.token
    );

    assert(createRes.status === 201, 'POST /api/listings returns 201 Created');
    assert(createRes.body.success === true, 'Response body success is true');
    const listing = createRes.body.data?.listing;
    assert(
      listing?.title === 'Aluminium Extrusion Scrap 6063 Grade',
      'Scrap material name saved and returned accurately'
    );
    assert(listing?.country === 'India', 'Country saved as India');
    assert(listing?.state === 'Tamil Nadu', 'State saved as Tamil Nadu');
    assert(listing?.district === 'Chennai', 'District saved as Chennai');
    assert(listing?.city === 'Guindy Industrial Estate', 'City saved as Guindy Industrial Estate');
    assert(
      listing?.location === 'Guindy Industrial Estate, Chennai, Tamil Nadu, India',
      'Combined location string formatted and saved properly'
    );
    assert(listing?.latitude === 13.0067, 'Latitude coordinate saved');
    assert(listing?.longitude === 80.2023, 'Longitude coordinate saved');
    createdListingId = listing?.id;

    // 3. Auto location string generation when location is omitted
    console.log('\n--- Automatic Location String Generation ---');
    const autoLocRes = await request(
      'POST',
      '/api/listings',
      {
        title: 'HDPE Granules Regrind Batch',
        waste_type: 'Plastic',
        quantity: 600,
        price_per_kg: 48,
        country: 'India',
        state: 'Telangana',
        district: 'Medchal-Malkajgiri',
        city: 'Jeedimetla Industrial Area',
        description: 'Clean washed regrind.',
      },
      seller.token
    );

    assert(autoLocRes.status === 201, 'POST /api/listings without explicit location returns 201 Created');
    assert(
      autoLocRes.body.data?.listing?.location ===
        'Jeedimetla Industrial Area, Medchal-Malkajgiri, Telangana, India',
      'Service automatically generated combined location string'
    );

    // 4. Validation: Scrap Material Name constraints
    console.log('\n--- Scrap Material Name Validation ---');
    const emptyTitleRes = await request(
      'POST',
      '/api/listings',
      {
        title: '  ',
        waste_type: 'Paper',
        quantity: 100,
        price_per_kg: 10,
        city: 'Salem',
        state: 'Tamil Nadu',
      },
      seller.token
    );
    assert(emptyTitleRes.status === 400, 'Rejects empty Scrap Material Name with 400 Bad Request');

    const shortTitleRes = await request(
      'POST',
      '/api/listings',
      {
        title: 'ab',
        waste_type: 'Paper',
        quantity: 100,
        price_per_kg: 10,
        city: 'Salem',
        state: 'Tamil Nadu',
      },
      seller.token
    );
    assert(shortTitleRes.status === 400, 'Rejects Scrap Material Name < 3 chars with 400 Bad Request');

    const longTitleRes = await request(
      'POST',
      '/api/listings',
      {
        title: 'A'.repeat(151),
        waste_type: 'Paper',
        quantity: 100,
        price_per_kg: 10,
        city: 'Salem',
        state: 'Tamil Nadu',
      },
      seller.token
    );
    assert(longTitleRes.status === 400, 'Rejects Scrap Material Name > 150 chars with 400 Bad Request');

    // 5. Validation: Missing Location
    console.log('\n--- Location Requirement Validation ---');
    const noLocRes = await request(
      'POST',
      '/api/listings',
      {
        title: 'Corrugated Cardboard Bales',
        waste_type: 'Paper',
        quantity: 100,
        price_per_kg: 10,
        location: '',
        city: '',
        state: '',
      },
      seller.token
    );
    assert(noLocRes.status === 400, 'Rejects listing without location or city/state with 400 Bad Request');

    // 6. Update Listing with Refined Fields
    console.log('\n--- Listing Update with Refined Fields ---');
    const updateRes = await request(
      'PATCH',
      `/api/listings/${createdListingId}`,
      {
        title: 'Aluminium Extrusion Scrap 6063 (High Purity)',
        city: 'Ambattur Industrial Estate',
        district: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
      },
      seller.token
    );

    assert(updateRes.status === 200, 'PATCH /api/listings/:id returns 200 OK');
    assert(
      updateRes.body.data?.listing?.title === 'Aluminium Extrusion Scrap 6063 (High Purity)',
      'Updated material name reflected in response'
    );
    assert(
      updateRes.body.data?.listing?.city === 'Ambattur Industrial Estate',
      'Updated city reflected in response'
    );
    assert(
      updateRes.body.data?.listing?.location ===
        'Ambattur Industrial Estate, Chennai, Tamil Nadu, India',
      'Location string dynamically recomputed on update'
    );

    // 7. Backward compatibility: Legacy listing with only location string
    console.log('\n--- Backward Compatibility ---');
    const legacyRes = await request(
      'POST',
      '/api/listings',
      {
        title: 'Legacy Cotton Scrap Batch',
        waste_type: 'Textile',
        quantity: 300,
        price_per_kg: 25,
        location: 'Tirupur Textile Hub',
      },
      seller.token
    );

    assert(legacyRes.status === 201, 'Legacy listing created successfully with location text');
    assert(legacyRes.body.data?.listing?.location === 'Tirupur Textile Hub', 'Location preserved');
    assert(legacyRes.body.data?.listing?.country === 'India', 'Country defaults to India');

  } catch (err) {
    console.error('\n❌ Test execution failed with error:', err);
    failed++;
  } finally {
    // Cleanup test records
    await pool.execute('DELETE FROM waste_listings WHERE title LIKE ?', ['%Scrap%', '%Batch%', '%Bales%']);
    await pool.execute('DELETE FROM users WHERE email LIKE ?', ['refine_%']);

    console.log('\n------------------------------------------------------');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('------------------------------------------------------\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
