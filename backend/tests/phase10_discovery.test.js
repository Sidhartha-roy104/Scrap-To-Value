/**
 * tests/phase10_discovery.test.js
 * -------------------------------
 * Automated test suite for Phase 10:
 * Simple Marketplace Search, Filters, Sorting & Discovery.
 *
 * Tests:
 * 1. Search by title (partial case-insensitive)
 * 2. Search by material / waste_type
 * 3. Search by description
 * 4. Search by category
 * 5. Category filter (exact waste_type match)
 * 6. Location filter (partial match)
 * 7. Minimum price filter (price_per_kg >= min_price)
 * 8. Maximum price filter (price_per_kg <= max_price)
 * 9. Price range filter (min_price <= price_per_kg <= max_price)
 * 10. Minimum quantity filter (available_quantity >= min_quantity)
 * 11. Sorting: newest (created_at DESC)
 * 12. Sorting: price_asc (price_per_kg ASC)
 * 13. Sorting: price_desc (price_per_kg DESC)
 * 14. Sorting: quantity_desc (available_quantity DESC)
 * 15. Server-side pagination metadata (page, limit, total, totalPages)
 * 16. Empty result response (clean empty array and total: 0)
 * 17. Validation: invalid page (page <= 0) returns 400
 * 18. Validation: invalid min_price (negative) returns 400
 * 19. Validation: invalid sort value returns 400
 * 20. Validation: search length > 100 chars returns 400
 * 21. Visibility rule: Inactive/Sold listings excluded from public marketplace
 */

const http = require('http');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('../src/config/db');

const PORT = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET || 'your-default-jwt-secret-replace-in-production';

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  [PASS] ${description}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${description}`);
    failed++;
  }
}

const BASE_URL = `http://localhost:${PORT}`;

function req(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(path, BASE_URL);
    const payload = data ? JSON.stringify(data) : '';
    const headers = {
      'Content-Type': 'application/json',
      ...(data ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    const r = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : null;
            resolve({ status: res.statusCode, body: parsed });
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
  console.log('\n================================================================');
  console.log('   PHASE 10: MARKETPLACE SEARCH, FILTERS & DISCOVERY TESTS      ');
  console.log('================================================================\n');

  const testPrefix = `p10_${Date.now()}`;
  const testListingIds = [];
  let createdSellerId = null;

  try {
    // 0. Setup test seller user
    const [sellers] = await pool.query(`SELECT id FROM users WHERE role = 'seller' LIMIT 1`);
    let sellerId;
    if (sellers.length > 0) {
      sellerId = sellers[0].id;
    } else {
      sellerId = crypto.randomUUID();
      createdSellerId = sellerId;
      await pool.query(
        `INSERT INTO users (id, email, password_hash, role, display_name, company_name, created_at, updated_at)
         VALUES (?, ?, 'hash', 'seller', 'P10 Test Seller', 'P10 Recyclers Ltd', NOW(), NOW())`,
        [sellerId, `${testPrefix}_seller@rubbishrevamp.dev`]
      );
    }

    // 0b. Helper to insert listing
    async function insertListing(data) {
      const id = crypto.randomUUID();
      testListingIds.push(id);
      await pool.query(
        `INSERT INTO waste_listings (
          id, user_id, waste_type, title, description,
          quantity, available_quantity, reserved_quantity, fulfilled_quantity,
          unit, price_per_kg, total_price, location, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'kg', ?, ?, ?, ?, ?, ?)`,
        [
          id,
          sellerId,
          data.waste_type,
          data.title,
          data.description || null,
          data.quantity,
          data.available_quantity !== undefined ? data.available_quantity : data.quantity,
          data.price_per_kg,
          parseFloat((data.quantity * data.price_per_kg).toFixed(2)),
          data.location || 'Chennai',
          data.status || 'Available',
          data.created_at || new Date(),
          data.updated_at || new Date(),
        ]
      );
      return id;
    }

    console.log('Setting up Phase 10 test listings...');
    // Item 1: High grade copper wire
    const l1 = await insertListing({
      waste_type: 'Metal',
      title: `${testPrefix} High Grade Copper Wire Spools`,
      description: 'Clean bright copper wire 99% purity suitable for industrial smelting.',
      quantity: 500,
      available_quantity: 500,
      price_per_kg: 450.00,
      location: 'Chennai',
      created_at: new Date(Date.now() - 3600000 * 5),
    });

    // Item 2: Scrap Aluminum sheets
    const l2 = await insertListing({
      waste_type: 'Metal',
      title: `${testPrefix} Industrial Aluminum Scrap Sheets`,
      description: 'Baled 6061 aluminum alloy cutoffs from aircraft assembly.',
      quantity: 1200,
      available_quantity: 1200,
      price_per_kg: 180.00,
      location: 'Coimbatore',
      created_at: new Date(Date.now() - 3600000 * 4),
    });

    // Item 3: Recycled PET flakes
    const l3 = await insertListing({
      waste_type: 'Plastic',
      title: `${testPrefix} Clear Washed PET Flakes`,
      description: 'Hot washed transparent bottle flakes with PVC contamination under 50ppm.',
      quantity: 800,
      available_quantity: 800,
      price_per_kg: 65.00,
      location: 'Madurai',
      created_at: new Date(Date.now() - 3600000 * 3),
    });

    // Item 4: Corrugated cardboard baled
    const l4 = await insertListing({
      waste_type: 'Paper',
      title: `${testPrefix} Baled Corrugated Kraft Cardboard`,
      description: 'Dry double-walled corrugated boxes baled and strapped.',
      quantity: 3000,
      available_quantity: 3000,
      price_per_kg: 14.00,
      location: 'Chennai',
      created_at: new Date(Date.now() - 3600000 * 2),
    });

    // Item 5: Shredded Cotton Textiles
    const l5 = await insertListing({
      waste_type: 'Textile',
      title: `${testPrefix} Shredded Cotton Garment Clips`,
      description: 'Virgin 100% white cotton textile cuttings for yarn spinning.',
      quantity: 250,
      available_quantity: 250,
      price_per_kg: 40.00,
      location: 'Tirupur',
      created_at: new Date(Date.now() - 3600000 * 1),
    });

    // Item 6: Inactive / Sold listing (Should NOT be discovered on public marketplace)
    const l6 = await insertListing({
      waste_type: 'Metal',
      title: `${testPrefix} Sold Brass Valves Lot`,
      description: 'Historical batch that has already been sold.',
      quantity: 100,
      available_quantity: 0,
      price_per_kg: 320.00,
      location: 'Chennai',
      status: 'Sold',
      created_at: new Date(),
    });

    // -------------------------------------------------------------
    // Section 1: Search Functionality
    // -------------------------------------------------------------
    console.log('\n--- Section 1: Search Functionality ---');
    {
      // 1. Search by title (partial, case-insensitive)
      const resTitle = await req(`/api/listings?search=${testPrefix} High Grade`);
      assert('Search by title returns 200 OK', resTitle.status === 200);
      assert('Search by title finds copper wire listing', resTitle.body.data.listings.some((l) => l.id === l1));
      assert('Search by title does not return irrelevant plastic flakes', !resTitle.body.data.listings.some((l) => l.id === l3));

      // 2. Search by material / title substring
      const resMaterial = await req(`/api/listings?search=aircraft assembly&limit=50`);
      assert('Search by material/description name finds aluminum listing', resMaterial.body.data.listings.some((l) => l.id === l2));

      // 3. Search by description keyword
      const resDesc = await req(`/api/listings?search=contamination&limit=50`);
      assert('Search by description keyword finds PET flakes listing', resDesc.body.data.listings.some((l) => l.id === l3));

      // 4. Search by category / material keyword
      const resCatSearch = await req(`/api/listings?search=Garment Clips&limit=50`);
      assert('Search by category term finds textile listing', resCatSearch.body.data.listings.some((l) => l.id === l5));
    }

    // -------------------------------------------------------------
    // Section 2: Filters Functionality
    // -------------------------------------------------------------
    console.log('\n--- Section 2: Filters Functionality ---');
    {
      // 5. Category Filter
      const resCat = await req(`/api/listings?search=${testPrefix}&category=Plastic`);
      assert('Category filter returns 200 OK', resCat.status === 200);
      assert('Category filter returns plastic listing', resCat.body.data.listings.some((l) => l.id === l3));
      assert('Category filter excludes metal and paper listings', resCat.body.data.listings.every((l) => l.waste_type === 'Plastic'));

      // 6. Location Filter
      const resLoc = await req(`/api/listings?search=${testPrefix}&location=Tirupur`);
      assert('Location filter returns 200 OK', resLoc.status === 200);
      assert('Location filter returns Tirupur listing', resLoc.body.data.listings.some((l) => l.id === l5));
      assert('Location filter excludes Chennai listings', !resLoc.body.data.listings.some((l) => l.id === l1));

      // 7. Minimum Price Filter
      const resMinPrice = await req(`/api/listings?search=${testPrefix}&min_price=100`);
      assert('Min price filter returns 200 OK', resMinPrice.status === 200);
      assert('Min price filter includes items >= 100/kg (copper, aluminum)', 
        resMinPrice.body.data.listings.some((l) => l.id === l1) &&
        resMinPrice.body.data.listings.some((l) => l.id === l2)
      );
      assert('Min price filter excludes items < 100/kg (cardboard 14, PET 65)',
        !resMinPrice.body.data.listings.some((l) => l.id === l4) &&
        !resMinPrice.body.data.listings.some((l) => l.id === l3)
      );

      // 8. Maximum Price Filter
      const resMaxPrice = await req(`/api/listings?search=${testPrefix}&max_price=50`);
      assert('Max price filter returns 200 OK', resMaxPrice.status === 200);
      assert('Max price filter includes items <= 50/kg (cardboard 14, textile 40)',
        resMaxPrice.body.data.listings.some((l) => l.id === l4) &&
        resMaxPrice.body.data.listings.some((l) => l.id === l5)
      );
      assert('Max price filter excludes items > 50/kg (copper 450, aluminum 180)',
        !resMaxPrice.body.data.listings.some((l) => l.id === l1) &&
        !resMaxPrice.body.data.listings.some((l) => l.id === l2)
      );

      // 9. Price Range Filter (min_price + max_price)
      const resPriceRange = await req(`/api/listings?search=${testPrefix}&min_price=50&max_price=200`);
      assert('Price range filter includes 65 and 180',
        resPriceRange.body.data.listings.some((l) => l.id === l3) &&
        resPriceRange.body.data.listings.some((l) => l.id === l2)
      );
      assert('Price range filter excludes 14 (too low) and 450 (too high)',
        !resPriceRange.body.data.listings.some((l) => l.id === l4) &&
        !resPriceRange.body.data.listings.some((l) => l.id === l1)
      );

      // 10. Minimum Available Quantity Filter
      const resMinQty = await req(`/api/listings?search=${testPrefix}&min_quantity=1000`);
      assert('Min quantity filter returns 200 OK', resMinQty.status === 200);
      assert('Min quantity filter includes aluminum (1200kg) and paper (3000kg)',
        resMinQty.body.data.listings.some((l) => l.id === l2) &&
        resMinQty.body.data.listings.some((l) => l.id === l4)
      );
      assert('Min quantity filter excludes copper (500kg) and textiles (250kg)',
        !resMinQty.body.data.listings.some((l) => l.id === l1) &&
        !resMinQty.body.data.listings.some((l) => l.id === l5)
      );
    }

    // -------------------------------------------------------------
    // Section 3: Safe Allowlisted Sorting
    // -------------------------------------------------------------
    console.log('\n--- Section 3: Safe Allowlisted Sorting ---');
    {
      // 11. Newest Sorting
      const resNewest = await req(`/api/listings?search=${testPrefix}&sort=newest`);
      assert('Sort newest returns 200 OK', resNewest.status === 200);
      const newestListings = resNewest.body.data.listings;
      assert('Sort newest orders listings from newest to oldest',
        new Date(newestListings[0].created_at).getTime() >= new Date(newestListings[1].created_at).getTime()
      );

      // 12. Price Ascending Sorting
      const resPriceAsc = await req(`/api/listings?search=${testPrefix}&sort=price_asc`);
      assert('Sort price_asc returns 200 OK', resPriceAsc.status === 200);
      const ascListings = resPriceAsc.body.data.listings;
      assert('Sort price_asc has cheapest item first (cardboard 14/kg)', ascListings[0].id === l4);
      assert('Sort price_asc strictly orders in ascending price',
        ascListings.every((l, idx) => idx === 0 || l.price_per_kg >= ascListings[idx - 1].price_per_kg)
      );

      // 13. Price Descending Sorting
      const resPriceDesc = await req(`/api/listings?search=${testPrefix}&sort=price_desc`);
      assert('Sort price_desc returns 200 OK', resPriceDesc.status === 200);
      const descListings = resPriceDesc.body.data.listings;
      assert('Sort price_desc has most expensive item first (copper 450/kg)', descListings[0].id === l1);
      assert('Sort price_desc strictly orders in descending price',
        descListings.every((l, idx) => idx === 0 || l.price_per_kg <= descListings[idx - 1].price_per_kg)
      );

      // 14. Quantity Descending Sorting
      const resQtyDesc = await req(`/api/listings?search=${testPrefix}&sort=quantity_desc`);
      assert('Sort quantity_desc returns 200 OK', resQtyDesc.status === 200);
      const qtyListings = resQtyDesc.body.data.listings;
      assert('Sort quantity_desc has highest available qty first (cardboard 3000kg)', qtyListings[0].id === l4);
      assert('Sort quantity_desc has lowest available qty last among test items',
        qtyListings[qtyListings.length - 1].available_quantity <= qtyListings[0].available_quantity
      );
    }

    // -------------------------------------------------------------
    // Section 4: Server-Side Pagination
    // -------------------------------------------------------------
    console.log('\n--- Section 4: Server-Side Pagination ---');
    {
      // 15. Pagination Metadata & Offsets
      const resPage1 = await req(`/api/listings?search=${testPrefix}&page=1&limit=2`);
      assert('Pagination page 1 returns 200 OK', resPage1.status === 200);
      assert('Pagination returns exactly 2 listings', resPage1.body.data.listings.length === 2);
      assert('Pagination returns correct page number', resPage1.body.data.page === 1);
      assert('Pagination returns correct limit', resPage1.body.data.limit === 2);
      assert('Pagination returns total count of 5 active test items', resPage1.body.data.total === 5);
      assert('Pagination calculates totalPages correctly (Math.ceil(5/2) = 3)', resPage1.body.data.totalPages === 3);

      const resPage2 = await req(`/api/listings?search=${testPrefix}&page=2&limit=2`);
      assert('Pagination page 2 returns 200 OK', resPage2.status === 200);
      assert('Pagination page 2 returns different listings from page 1',
        resPage2.body.data.listings[0].id !== resPage1.body.data.listings[0].id &&
        resPage2.body.data.listings[0].id !== resPage1.body.data.listings[1].id
      );

      // 16. Empty Result on High Page
      const resHighPage = await req(`/api/listings?search=${testPrefix}&page=999&limit=10`);
      assert('High page returns 200 OK with empty listings array', 
        resHighPage.status === 200 && resHighPage.body.data.listings.length === 0
      );

      // Empty search term result
      const resNoMatch = await req(`/api/listings?search=NONEXISTENT_KEYWORD_${Date.now()}`);
      assert('No match returns 200 OK', resNoMatch.status === 200);
      assert('No match returns empty listings array', resNoMatch.body.data.listings.length === 0);
      assert('No match returns total = 0', resNoMatch.body.data.total === 0);
    }

    // -------------------------------------------------------------
    // Section 5: Validation & Security Rules
    // -------------------------------------------------------------
    console.log('\n--- Section 5: Backend Validation & Security Rules ---');
    {
      // 17. Invalid Page Value
      const resBadPage = await req('/api/listings?page=0');
      assert('Invalid page=0 returns 400 Bad Request', resBadPage.status === 400);

      const resNegativePage = await req('/api/listings?page=-5');
      assert('Negative page returns 400 Bad Request', resNegativePage.status === 400);

      // 18. Invalid Price Value
      const resBadPrice = await req('/api/listings?min_price=-20');
      assert('Negative min_price returns 400 Bad Request', resBadPrice.status === 400);

      const resAlphaPrice = await req('/api/listings?max_price=abc');
      assert('Non-numeric max_price returns 400 Bad Request', resAlphaPrice.status === 400);

      const resBadQty = await req('/api/listings?min_quantity=-1');
      assert('Negative min_quantity returns 400 Bad Request', resBadQty.status === 400);

      // 19. Invalid Sort Option
      const resBadSort = await req('/api/listings?sort=DROP_TABLE');
      assert('Invalid sort parameter returns 400 Bad Request', resBadSort.status === 400);

      // 20. Search Query Length Limit (> 100 chars)
      const longQuery = 'a'.repeat(101);
      const resLongSearch = await req(`/api/listings?search=${longQuery}`);
      assert('Search query > 100 characters returns 400 Bad Request', resLongSearch.status === 400);

      // 21. Marketplace Visibility / Security Guard (Excluded 'Sold' / 'Inactive' listings)
      const resVisibility = await req(`/api/listings?search=${testPrefix}`);
      assert('Public marketplace returns only status=Available listings',
        resVisibility.body.data.listings.every((l) => l.status === 'Available')
      );
      assert('Sold test listing is NOT returned in public marketplace discovery',
        !resVisibility.body.data.listings.some((l) => l.id === l6)
      );
    }

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    console.log('\nCleaning up Phase 10 test fixtures...');
    if (testListingIds.length > 0) {
      await pool.query(
        `DELETE FROM waste_listings WHERE id IN (?)`,
        [testListingIds]
      );
    }
    if (createdSellerId) {
      await pool.query(
        `DELETE FROM users WHERE id = ?`,
        [createdSellerId]
      );
    }
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
