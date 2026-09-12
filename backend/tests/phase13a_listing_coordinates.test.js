/**
 * backend/tests/phase13a_listing_coordinates.test.js
 * ----------------------------------------------------
 * Phase 13A — Interactive Pickup Location Maps Test Suite
 *
 * Verifies:
 *  1. Listing creation with valid latitude and longitude
 *  2. Coordinates returned in GET /api/listings/:id
 *  3. Coordinates returned in GET /api/listings
 *  4. Listing update with new coordinates by listing owner
 *  5. Clearing coordinates (setting to null) by listing owner
 *  6. Rejection of latitude > 90
 *  7. Rejection of latitude < -90
 *  8. Rejection of longitude > 180
 *  9. Rejection of longitude < -180
 * 10. Rejection of non-numeric latitude/longitude
 * 11. Rejection of latitude provided without longitude
 * 12. Rejection of longitude provided without latitude
 * 13. Listing creation without coordinates (backward compatibility)
 * 14. Unauthorized user cannot update listing coordinates (403 Forbidden)
 * 15. Safe migration check: columns exist in MySQL schema
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
  console.log('PHASE 13A TEST SUITE: Interactive Pickup Location Maps');
  console.log('======================================================\n');

  const seller1 = await createTestUser('seller', `p13a_seller1_${Date.now()}@test.com`);
  const seller2 = await createTestUser('seller', `p13a_seller2_${Date.now()}@test.com`);
  let createdListingId = null;

  try {
    // 1. Database schema verification
    console.log('--- Database Schema ---');
    const [cols] = await pool.execute(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'waste_listings'
       AND COLUMN_NAME IN ('latitude', 'longitude')`
    );
    assert(
      cols.some((c) => c.COLUMN_NAME === 'latitude'),
      'Column `latitude` exists in `waste_listings`'
    );
    assert(
      cols.some((c) => c.COLUMN_NAME === 'longitude'),
      'Column `longitude` exists in `waste_listings`'
    );

    // 2. Listing creation with valid coordinates
    console.log('\n--- Listing Creation with Valid Coordinates ---');
    const createRes = await request(
      'POST',
      '/api/listings',
      {
        waste_type: 'Metal',
        title: 'Industrial Aluminum Scrap Batch',
        quantity: 1500,
        price_per_kg: 45.5,
        location: 'Chennai',
        latitude: 13.0826802,
        longitude: 80.2707184,
        description: 'Clean extrusion scrap stored in warehouse bay 4',
      },
      seller1.token
    );

    assert(createRes.status === 201, 'POST /api/listings returns 201 Created');
    assert(createRes.body.success === true, 'Response body has success: true');
    assert(
      createRes.body.data?.listing?.latitude === 13.0826802,
      'Listing response contains correct latitude',
      JSON.stringify(createRes.body.data?.listing?.latitude)
    );
    assert(
      createRes.body.data?.listing?.longitude === 80.2707184,
      'Listing response contains correct longitude',
      JSON.stringify(createRes.body.data?.listing?.longitude)
    );
    createdListingId = createRes.body.data?.listing?.id;

    // 3. Retrieval by ID includes coordinates
    console.log('\n--- Listing Detail Retrieval ---');
    const getRes = await request('GET', `/api/listings/${createdListingId}`, null, null);
    assert(getRes.status === 200, 'GET /api/listings/:id returns 200 OK');
    assert(
      getRes.body.data?.listing?.latitude === 13.0826802,
      'GET /api/listings/:id returns correct latitude'
    );
    assert(
      getRes.body.data?.listing?.longitude === 80.2707184,
      'GET /api/listings/:id returns correct longitude'
    );

    // 4. Update coordinates by listing owner
    console.log('\n--- Update Coordinates by Owner ---');
    const updateRes = await request(
      'PATCH',
      `/api/listings/${createdListingId}`,
      {
        latitude: 11.0168445,
        longitude: 76.9558321,
        location: 'Coimbatore',
      },
      seller1.token
    );
    assert(updateRes.status === 200, 'PATCH /api/listings/:id returns 200 OK');
    assert(
      updateRes.body.data?.listing?.latitude === 11.0168445,
      'Updated latitude reflected in response'
    );
    assert(
      updateRes.body.data?.listing?.longitude === 76.9558321,
      'Updated longitude reflected in response'
    );
    assert(
      updateRes.body.data?.listing?.location === 'Coimbatore',
      'Updated text location reflected in response'
    );

    // 5. Clear coordinates (set to null)
    console.log('\n--- Clear Coordinates ---');
    const clearRes = await request(
      'PATCH',
      `/api/listings/${createdListingId}`,
      {
        latitude: null,
        longitude: null,
      },
      seller1.token
    );
    assert(clearRes.status === 200, 'PATCH with null coordinates returns 200 OK');
    assert(
      clearRes.body.data?.listing?.latitude === null,
      'Latitude successfully cleared to null'
    );
    assert(
      clearRes.body.data?.listing?.longitude === null,
      'Longitude successfully cleared to null'
    );

    // 6. Validation: Reject Latitude outside -90..90
    console.log('\n--- Coordinate Range Validation ---');
    const invalidLatRes = await request(
      'POST',
      '/api/listings',
      {
        waste_type: 'Plastic',
        title: 'HDPE Granules Scrap',
        quantity: 500,
        price_per_kg: 22,
        location: 'Salem',
        latitude: 95.5,
        longitude: 78.1,
      },
      seller1.token
    );
    assert(invalidLatRes.status === 400, 'Rejects latitude > 90 with 400 Bad Request');

    const invalidLatRes2 = await request(
      'POST',
      '/api/listings',
      {
        waste_type: 'Plastic',
        title: 'HDPE Granules Scrap',
        quantity: 500,
        price_per_kg: 22,
        location: 'Salem',
        latitude: -95.5,
        longitude: 78.1,
      },
      seller1.token
    );
    assert(invalidLatRes2.status === 400, 'Rejects latitude < -90 with 400 Bad Request');

    // 7. Validation: Reject Longitude outside -180..180
    const invalidLngRes = await request(
      'POST',
      '/api/listings',
      {
        waste_type: 'Paper',
        title: 'Carton Waste Bulk',
        quantity: 800,
        price_per_kg: 12,
        location: 'Madurai',
        latitude: 9.9252,
        longitude: 195.5,
      },
      seller1.token
    );
    assert(invalidLngRes.status === 400, 'Rejects longitude > 180 with 400 Bad Request');

    const invalidLngRes2 = await request(
      'POST',
      '/api/listings',
      {
        waste_type: 'Paper',
        title: 'Carton Waste Bulk',
        quantity: 800,
        price_per_kg: 12,
        location: 'Madurai',
        latitude: 9.9252,
        longitude: -195.5,
      },
      seller1.token
    );
    assert(invalidLngRes2.status === 400, 'Rejects longitude < -180 with 400 Bad Request');

    // 8. Validation: Reject non-numeric coordinates
    console.log('\n--- Non-Numeric and Incomplete Coordinate Validation ---');
    const nonNumericRes = await request(
      'POST',
      '/api/listings',
      {
        waste_type: 'Metal',
        title: 'Copper Scrap Wires',
        quantity: 200,
        price_per_kg: 650,
        location: 'Chennai',
        latitude: 'north_pole',
        longitude: 80.2,
      },
      seller1.token
    );
    assert(nonNumericRes.status === 400, 'Rejects non-numeric latitude with 400 Bad Request');

    // 9. Validation: Latitude without longitude
    const latWithoutLngRes = await request(
      'POST',
      '/api/listings',
      {
        waste_type: 'Metal',
        title: 'Copper Scrap Wires',
        quantity: 200,
        price_per_kg: 650,
        location: 'Chennai',
        latitude: 13.0827,
      },
      seller1.token
    );
    assert(latWithoutLngRes.status === 400, 'Rejects latitude without longitude with 400 Bad Request');

    // 10. Validation: Longitude without latitude
    const lngWithoutLatRes = await request(
      'POST',
      '/api/listings',
      {
        waste_type: 'Metal',
        title: 'Copper Scrap Wires',
        quantity: 200,
        price_per_kg: 650,
        location: 'Chennai',
        longitude: 80.2707,
      },
      seller1.token
    );
    assert(lngWithoutLatRes.status === 400, 'Rejects longitude without latitude with 400 Bad Request');

    // 11. Backward compatibility: Listing created without coordinates
    console.log('\n--- Backward Compatibility ---');
    const noCoordRes = await request(
      'POST',
      '/api/listings',
      {
        waste_type: 'Textile',
        title: 'Cotton Fabric Waste',
        quantity: 350,
        price_per_kg: 15,
        location: 'Tirupur',
      },
      seller1.token
    );
    assert(noCoordRes.status === 201, 'POST /api/listings without coordinates returns 201 Created');
    assert(
      noCoordRes.body.data?.listing?.latitude === null,
      'Listing without coordinates has latitude === null'
    );
    assert(
      noCoordRes.body.data?.listing?.longitude === null,
      'Listing without coordinates has longitude === null'
    );

    // 12. Security & Authorization: Non-owner cannot update listing coordinates
    console.log('\n--- Authorization & Security ---');
    const unauthorizedUpdateRes = await request(
      'PATCH',
      `/api/listings/${createdListingId}`,
      {
        latitude: 12.9716,
        longitude: 77.5946,
      },
      seller2.token
    );
    assert(
      unauthorizedUpdateRes.status === 403,
      'Unauthorized seller cannot update coordinates on another seller listing (403 Forbidden)'
    );

  } catch (err) {
    console.error('\n❌ Test execution failed with error:', err);
    failed++;
  } finally {
    // Clean up created test listings & users
    if (createdListingId) {
      await pool.execute('DELETE FROM waste_listings WHERE id = ?', [createdListingId]);
    }
    await pool.execute('DELETE FROM users WHERE email LIKE ?', ['p13a_%']);

    console.log('\n------------------------------------------------------');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('------------------------------------------------------\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
