/**
 * services/requestService.js
 * --------------------------
 * Business logic for collection requests (buyer scrap requests) connected to MySQL.
 */

const crypto = require('crypto');
const { pool } = require('../config/db');

/**
 * Formats a raw database row into a structured response object.
 */
function formatRequest(row) {
  let trackingUpdates = [];
  if (row.tracking_updates) {
    try {
      trackingUpdates = typeof row.tracking_updates === 'string'
        ? JSON.parse(row.tracking_updates)
        : row.tracking_updates;
    } catch {
      trackingUpdates = [];
    }
  }

  return {
    id: row.id,
    listing_id: row.listing_id,
    buyer_id: row.buyer_id,
    seller_id: row.seller_id,
    waste_type: row.waste_type,
    quantity: parseFloat(row.quantity),
    price_per_kg: parseFloat(row.price_per_kg),
    amount: parseFloat(row.amount),
    buyer_message: row.buyer_message ?? null,
    status: row.status,
    tracking_updates: trackingUpdates,
    estimated_delivery: row.estimated_delivery ?? null,
    delivery_otp: row.delivery_otp ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    listing: row.listing_title
      ? {
          id: row.listing_id,
          title: row.listing_title,
          unit: row.listing_unit || 'kg',
          image_url: row.listing_image_url || null,
          location: row.listing_location || null,
          available_quantity: row.listing_quantity !== undefined && row.listing_quantity !== null
            ? parseFloat(row.listing_quantity)
            : undefined,
        }
      : undefined,
    buyer: row.buyer_name
      ? {
          id: row.buyer_id,
          name: row.buyer_name,
          email: row.buyer_email,
          company: row.buyer_company ?? null,
          phone: row.buyer_phone ?? null,
        }
      : undefined,
    seller: row.seller_name
      ? {
          id: row.seller_id,
          name: row.seller_name,
          email: row.seller_email,
          company: row.seller_company ?? null,
          phone: row.seller_phone ?? null,
        }
      : undefined,
  };
}

/**
 * Creates a new collection request for a scrap listing.
 */
async function createRequest({
  buyerId,
  userRole,
  listing_id,
  requested_quantity,
  buyer_message = null,
}) {
  // 1. Role verification: Only buyers can initiate a scrap request
  if (userRole && userRole !== 'buyer') {
    const err = new Error('Access denied: Only buyers can request scrap listings.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  // 2. Fetch the listing from MySQL
  if (!listing_id) {
    const err = new Error('listing_id is required.');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const [listingRows] = await pool.execute(
    'SELECT * FROM waste_listings WHERE id = ? LIMIT 1',
    [listing_id]
  );

  if (listingRows.length === 0) {
    const err = new Error('Listing not found.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const listing = listingRows[0];

  if (listing.status !== 'Available') {
    const err = new Error(`Listing is no longer available (current status: ${listing.status}).`);
    err.code = 'BAD_REQUEST';
    throw err;
  }

  // 3. Prevent buyer from requesting their own listing
  if (listing.user_id === buyerId) {
    const err = new Error('You cannot request scrap from your own listing.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  // 4. Validate requested quantity
  const numQty = parseFloat(requested_quantity);
  if (isNaN(numQty) || numQty <= 0) {
    const err = new Error('Requested quantity must be a positive number greater than 0.');
    err.code = 'INVALID_QUANTITY';
    throw err;
  }

  const availableQty = parseFloat(listing.quantity);
  if (numQty > availableQty) {
    const err = new Error(
      `Requested quantity (${numQty} ${listing.unit || 'kg'}) exceeds available listing quantity (${availableQty} ${listing.unit || 'kg'}).`
    );
    err.code = 'QUANTITY_EXCEEDED';
    throw err;
  }

  // 5. Compute trusted pricing on backend
  const price_per_kg = parseFloat(listing.price_per_kg);
  const total_amount = parseFloat((numQty * price_per_kg).toFixed(2));
  const sellerId = listing.user_id;
  const wasteType = listing.waste_type;

  const id = crypto.randomUUID();
  const initialTracking = JSON.stringify([
    {
      status: 'pending',
      timestamp: new Date().toISOString(),
      note: 'Buyer submitted collection request',
    },
  ]);

  const sanitizedMessage = typeof buyer_message === 'string' ? buyer_message.trim() : null;

  // 6. Insert request record with status "pending"
  const insertQuery = `
    INSERT INTO collection_requests (
      id, listing_id, buyer_id, seller_id, waste_type,
      quantity, price_per_kg, amount, buyer_message,
      status, tracking_updates
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `;

  await pool.execute(insertQuery, [
    id,
    listing_id,
    buyerId,
    sellerId,
    wasteType,
    numQty,
    price_per_kg,
    total_amount,
    sanitizedMessage,
    initialTracking,
  ]);

  return getRequestById(id);
}

/**
 * Retrieves a single request by its ID with relational metadata.
 */
async function getRequestById(id) {
  const query = `
    SELECT 
      r.*,
      l.title as listing_title,
      l.unit as listing_unit,
      l.image_url as listing_image_url,
      l.quantity as listing_quantity,
      l.location as listing_location,
      b.display_name as buyer_name,
      b.email as buyer_email,
      b.company_name as buyer_company,
      b.phone as buyer_phone,
      s.display_name as seller_name,
      s.email as seller_email,
      s.company_name as seller_company,
      s.phone as seller_phone
    FROM collection_requests r
    LEFT JOIN waste_listings l ON r.listing_id = l.id
    LEFT JOIN users b ON r.buyer_id = b.id
    LEFT JOIN users s ON r.seller_id = s.id
    WHERE r.id = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(query, [id]);
  if (rows.length === 0) {
    const err = new Error('Collection request not found.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  return formatRequest(rows[0]);
}

/**
 * Retrieves all requests associated with a user (as buyer or seller).
 */
async function getRequests({
  userId,
  userRole,
  status,
  page = 1,
  limit = 50,
} = {}) {
  const conditions = [];
  const params = [];

  if (userRole === 'buyer') {
    conditions.push('r.buyer_id = ?');
    params.push(userId);
  } else if (userRole === 'seller') {
    conditions.push('r.seller_id = ?');
    params.push(userId);
  } else {
    conditions.push('(r.buyer_id = ? OR r.seller_id = ?)');
    params.push(userId, userId);
  }

  if (status && status !== 'All') {
    conditions.push('r.status = ?');
    params.push(status);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Count total
  const countQuery = `SELECT COUNT(*) as total FROM collection_requests r ${whereClause}`;
  const [countResult] = await pool.execute(countQuery, params);
  const total = countResult[0]?.total || 0;

  // Pagination
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const query = `
    SELECT 
      r.*,
      l.title as listing_title,
      l.unit as listing_unit,
      l.image_url as listing_image_url,
      l.quantity as listing_quantity,
      l.location as listing_location,
      b.display_name as buyer_name,
      b.email as buyer_email,
      b.company_name as buyer_company,
      b.phone as buyer_phone,
      s.display_name as seller_name,
      s.email as seller_email,
      s.company_name as seller_company,
      s.phone as seller_phone
    FROM collection_requests r
    LEFT JOIN waste_listings l ON r.listing_id = l.id
    LEFT JOIN users b ON r.buyer_id = b.id
    LEFT JOIN users s ON r.seller_id = s.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(query, [...params, parseInt(limit, 10), offset]);

  return {
    requests: rows.map((row) => formatRequest(row)),
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Updates a request status (e.g., seller confirming, completing, or cancelling).
 */
async function updateRequestStatus(id, userId, { status, note, estimated_delivery = null }) {
  const existing = await getRequestById(id);

  // 1. Authorization: Only the seller who owns this listing can update/accept/reject
  if (existing.seller_id !== userId) {
    const err = new Error('Forbidden: Only the seller who owns this listing can accept, reject, or update this request.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  const VALID_STATUSES = [
    'pending',
    'confirmed',
    'in_transit',
    'delivered',
    'cancelled',
    'disputed',
  ];

  if (!VALID_STATUSES.includes(status)) {
    const err = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    err.code = 'BAD_REQUEST';
    throw err;
  }

  // 2. Status transition validation
  if (existing.status === status) {
    return existing;
  }

  const ALLOWED_TRANSITIONS = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['in_transit', 'cancelled'],
    in_transit: ['delivered', 'disputed'],
    delivered: ['disputed'],
    cancelled: [],
    disputed: ['cancelled', 'delivered'],
  };

  const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
  if (!allowed.includes(status)) {
    const err = new Error(`Invalid status transition: Cannot change request from "${existing.status}" to "${status}".`);
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const currentTracking = Array.isArray(existing.tracking_updates)
    ? existing.tracking_updates
    : [];

  const newTracking = [
    ...currentTracking,
    {
      status,
      timestamp: new Date().toISOString(),
      note: note || `Status updated to ${status}`,
    },
  ];

  const query = `
    UPDATE collection_requests
    SET status = ?, tracking_updates = ?, estimated_delivery = COALESCE(?, estimated_delivery)
    WHERE id = ?
  `;

  await pool.execute(query, [
    status,
    JSON.stringify(newTracking),
    estimated_delivery,
    id,
  ]);

  return getRequestById(id);
}

module.exports = {
  createRequest,
  getRequestById,
  getRequests,
  updateRequestStatus,
};
