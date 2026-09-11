-- =============================================================================
-- Rubbish Revamp — Seed Data
-- =============================================================================
-- Development / demo seed data.
-- Based on mock data in frontend: src/data/mockData.ts
-- Run AFTER schema.sql has been executed.
-- =============================================================================

USE rubbish_revamp;

-- =============================================================================
-- Seed: users
-- Passwords below are bcrypt hashes of 'Password@123' (for dev only).
-- Replace with real hashed passwords in any non-local environment.
-- =============================================================================

INSERT INTO users (id, email, password_hash, role, display_name, company_name, company_address, phone, kyc_verified) VALUES
(
  'a1b2c3d4-0001-0000-0000-000000000001',
  'seller1@rubbishrevamp.dev',
  '$2b$10$examplehashfordevonlynotrealapplicationdata0001',
  'seller',
  'Rajesh Kumar',
  'Kumar Textiles, Erode',
  'Erode, Tamil Nadu, India',
  '+91-9876543210',
  1
),
(
  'a1b2c3d4-0002-0000-0000-000000000002',
  'seller2@rubbishrevamp.dev',
  '$2b$10$examplehashfordevonlynotrealapplicationdata0002',
  'seller',
  'Priya Nair',
  'Nagercoil Coir Industries',
  'Nagercoil, Tamil Nadu, India',
  '+91-9876543211',
  1
),
(
  'a1b2c3d4-0003-0000-0000-000000000003',
  'buyer1@rubbishrevamp.dev',
  '$2b$10$examplehashfordevonlynotrealapplicationdata0003',
  'buyer',
  'Suresh Babu',
  'Trichy Metals',
  'Tiruchirappalli, Tamil Nadu, India',
  '+91-9876543212',
  1
),
(
  'a1b2c3d4-0004-0000-0000-000000000004',
  'buyer2@rubbishrevamp.dev',
  '$2b$10$examplehashfordevonlynotrealapplicationdata0004',
  'buyer',
  'Anitha Devi',
  'Coimbatore Recyclers',
  'Coimbatore, Tamil Nadu, India',
  '+91-9876543213',
  0
);

-- =============================================================================
-- Seed: waste_listings
-- =============================================================================

INSERT INTO waste_listings (id, user_id, waste_type, title, description, quantity, unit, price_per_kg, total_price, location, status) VALUES
(
  'b1b2c3d4-0001-0000-0000-000000000001',
  'a1b2c3d4-0001-0000-0000-000000000001',
  'Metal',
  'Mild Steel Scrap — 500 kg',
  'Clean mild steel offcuts from fabrication. No rust. Available for immediate pickup.',
  500, 'kg', 32.00, 16000.00,
  'Erode, Tamil Nadu',
  'Available'
),
(
  'b1b2c3d4-0002-0000-0000-000000000002',
  'a1b2c3d4-0001-0000-0000-000000000001',
  'Plastic',
  'HDPE Plastic Drums — 200 kg',
  'Used HDPE food-grade drums, cleaned and ready for recycling.',
  200, 'kg', 18.50, 3700.00,
  'Erode, Tamil Nadu',
  'Available'
),
(
  'b1b2c3d4-0003-0000-0000-000000000003',
  'a1b2c3d4-0002-0000-0000-000000000002',
  'Textile',
  'Cotton Fabric Waste — 300 kg',
  'Mixed cotton cut pieces from garment manufacturing. Clean and sorted.',
  300, 'kg', 8.00, 2400.00,
  'Nagercoil, Tamil Nadu',
  'Pending'
);

-- =============================================================================
-- Seed: collection_requests
-- =============================================================================

INSERT INTO collection_requests (id, listing_id, buyer_id, seller_id, waste_type, quantity, amount, status, tracking_updates, estimated_delivery) VALUES
(
  'c1b2c3d4-0001-0000-0000-000000000001',
  'b1b2c3d4-0003-0000-0000-000000000003',
  'a1b2c3d4-0003-0000-0000-000000000003',
  'a1b2c3d4-0002-0000-0000-000000000002',
  'Textile',
  300,
  2400.00,
  'in_transit',
  JSON_ARRAY(
    JSON_OBJECT('timestamp', '2026-09-01T10:00:00Z', 'status', 'confirmed', 'note', 'Order confirmed by seller'),
    JSON_OBJECT('timestamp', '2026-09-02T08:30:00Z', 'status', 'in_transit', 'note', 'Pickup vehicle dispatched')
  ),
  '2026-09-12'
);

-- =============================================================================
-- Seed: ratings
-- =============================================================================

-- (No completed orders yet in seed data to rate)

-- =============================================================================
-- Seed: notifications
-- =============================================================================

INSERT INTO notifications (user_id, type, title, message, `read`) VALUES
(
  'a1b2c3d4-0001-0000-0000-000000000001',
  'deal',
  'New Order Received',
  'Suresh Babu from Trichy Metals placed an order for your Cotton Fabric Waste listing.',
  0
),
(
  'a1b2c3d4-0003-0000-0000-000000000003',
  'listing',
  'New Matching Listing',
  'A new Metal scrap listing in Erode matches your buying preferences.',
  1
);
