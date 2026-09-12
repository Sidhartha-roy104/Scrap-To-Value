/**
 * services/listingService.js
 * --------------------------
 * Business logic for waste listings connected to MySQL.
 */

const crypto = require('crypto');
const { pool } = require('../config/db');

const inventoryService = require('./inventoryService');

function resolveImageUrl(imageUrl, customBaseUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  const baseUrl = (typeof customBaseUrl === 'string' && customBaseUrl)
    ? customBaseUrl
    : (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`);
  const cleanBase = String(baseUrl).replace(/\/+$/, '');
  const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Maps a raw MySQL row to a clean response object.
 */
function formatListing(row, customBaseUrl) {
  const total = parseFloat(row.quantity);
  const available = row.available_quantity !== undefined && row.available_quantity !== null
    ? parseFloat(row.available_quantity)
    : total;
  const reserved = row.reserved_quantity !== undefined && row.reserved_quantity !== null
    ? parseFloat(row.reserved_quantity)
    : 0;
  const fulfilled = row.fulfilled_quantity !== undefined && row.fulfilled_quantity !== null
    ? parseFloat(row.fulfilled_quantity)
    : 0;

  return {
    id: row.id,
    user_id: row.user_id,
    waste_type: row.waste_type,
    title: row.title,
    description: row.description ?? null,
    quantity: total,
    total_quantity: total,
    available_quantity: available,
    reserved_quantity: reserved,
    fulfilled_quantity: fulfilled,
    unit: row.unit ?? 'kg',
    price_per_kg: parseFloat(row.price_per_kg),
    total_price: parseFloat(row.total_price),
    location: row.location,
    image_url: resolveImageUrl(row.image_url, customBaseUrl),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    seller: row.seller_name
      ? {
          name: row.seller_name,
          company: row.seller_company ?? null,
          phone: row.seller_phone ?? null,
          avatar_url: row.seller_avatar ?? null,
          avg_rating: row.seller_avg_rating !== undefined && row.seller_avg_rating !== null
            ? parseFloat(Number(row.seller_avg_rating).toFixed(1))
            : 0,
          total_ratings: row.seller_review_count !== undefined && row.seller_review_count !== null
            ? parseInt(row.seller_review_count, 10)
            : 0,
        }
      : undefined,
  };
}

/**
 * Creates a new waste listing for the authenticated user.
 */
async function createListing({
  userId,
  waste_type,
  title,
  description = null,
  quantity,
  unit = 'kg',
  price_per_kg,
  location,
  image_url = null,
  status = 'Available',
}) {
  const id = crypto.randomUUID();
  const numQty = parseFloat(quantity);
  const numPrice = parseFloat(price_per_kg);
  const total_price = parseFloat((numQty * numPrice).toFixed(2));

  const query = `
    INSERT INTO waste_listings (
      id, user_id, waste_type, title, description,
      quantity, available_quantity, reserved_quantity, fulfilled_quantity,
      unit, price_per_kg, total_price,
      location, image_url, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await pool.execute(query, [
    id,
    userId,
    waste_type,
    title,
    description,
    numQty,
    numQty, // available_quantity = initial total
    0.00,   // reserved_quantity
    0.00,   // fulfilled_quantity
    unit,
    numPrice,
    total_price,
    location,
    image_url,
    status,
  ]);

  // Log ledger transaction for initial stock addition
  await inventoryService.logListingCreation({
    listingId: id,
    quantity: numQty,
    actorId: userId,
    unit,
  });

  return getListingById(id);
}

/**
 * Retrieves listings with optional filters, search, sorting, and pagination.
 */
async function getListings({
  waste_type,
  category,
  location,
  status = 'Available',
  search,
  user_id,
  min_price,
  max_price,
  min_quantity,
  sort = 'newest',
  page = 1,
  limit = 12,
} = {}) {
  const conditions = [];
  const params = [];

  if (status && status !== 'All') {
    conditions.push('l.status = ?');
    params.push(status);
  }

  const cat = category || waste_type;
  if (cat && cat !== 'All') {
    conditions.push('l.waste_type = ?');
    params.push(cat);
  }

  if (location && location !== 'All' && String(location).trim()) {
    conditions.push('l.location LIKE ?');
    params.push(`%${String(location).trim()}%`);
  }

  if (user_id) {
    conditions.push('l.user_id = ?');
    params.push(user_id);
  }

  if (min_price !== undefined && min_price !== null && min_price !== '') {
    conditions.push('l.price_per_kg >= ?');
    params.push(parseFloat(min_price));
  }

  if (max_price !== undefined && max_price !== null && max_price !== '') {
    conditions.push('l.price_per_kg <= ?');
    params.push(parseFloat(max_price));
  }

  if (min_quantity !== undefined && min_quantity !== null && min_quantity !== '') {
    conditions.push('l.available_quantity >= ?');
    params.push(parseFloat(min_quantity));
  }

  if (search && String(search).trim()) {
    const s = `%${String(search).trim()}%`;
    conditions.push('(l.title LIKE ? OR l.description LIKE ? OR l.location LIKE ? OR l.waste_type LIKE ?)');
    params.push(s, s, s, s);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM waste_listings l ${whereClause}`;
  const [countResult] = await pool.query(countQuery, params);
  const total = countResult[0]?.total || 0;

  // Safe sorting mapping
  const SORT_MAP = {
    newest: 'l.created_at DESC',
    price_asc: 'l.price_per_kg ASC',
    price_desc: 'l.price_per_kg DESC',
    quantity_desc: 'l.available_quantity DESC',
  };
  const orderClause = SORT_MAP[sort] || SORT_MAP.newest;

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
  const offset = (pageNum - 1) * limitNum;

  const query = `
    SELECT 
      l.*,
      u.display_name as seller_name,
      u.company_name as seller_company,
      u.phone as seller_phone,
      u.avatar_url as seller_avatar,
      (
        SELECT ROUND(COALESCE(AVG(r.rating), 0), 1)
        FROM reviews r
        WHERE r.reviewee_id = l.user_id AND r.reviewer_role = 'buyer' AND r.status = 'visible'
      ) AS seller_avg_rating,
      (
        SELECT COUNT(*)
        FROM reviews r
        WHERE r.reviewee_id = l.user_id AND r.reviewer_role = 'buyer' AND r.status = 'visible'
      ) AS seller_review_count
    FROM waste_listings l
    LEFT JOIN users u ON l.user_id = u.id
    ${whereClause}
    ORDER BY ${orderClause}
    LIMIT ? OFFSET ?
  `;

  // Note: mysql2 query with LIMIT/OFFSET expects strings or numbers
  const [rows] = await pool.query(query, [...params, limitNum, offset]);

  return {
    listings: rows.map((row) => formatListing(row)),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
}

/**
 * Retrieves a single listing by its ID.
 */
async function getListingById(id) {
  const query = `
    SELECT 
      l.*,
      u.display_name as seller_name,
      u.company_name as seller_company,
      u.phone as seller_phone,
      u.avatar_url as seller_avatar,
      (
        SELECT ROUND(COALESCE(AVG(r.rating), 0), 1)
        FROM reviews r
        WHERE r.reviewee_id = l.user_id AND r.reviewer_role = 'buyer' AND r.status = 'visible'
      ) AS seller_avg_rating,
      (
        SELECT COUNT(*)
        FROM reviews r
        WHERE r.reviewee_id = l.user_id AND r.reviewer_role = 'buyer' AND r.status = 'visible'
      ) AS seller_review_count
    FROM waste_listings l
    LEFT JOIN users u ON l.user_id = u.id
    WHERE l.id = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(query, [id]);
  if (rows.length === 0) {
    const err = new Error('Listing not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  return formatListing(rows[0]);
}

/**
 * Updates a listing owned by the user.
 */
async function updateListing(id, userId, updates) {
  // Check ownership
  const existing = await getListingById(id);
  if (existing.user_id !== userId) {
    const err = new Error('Forbidden: You can only edit your own listings');
    err.code = 'FORBIDDEN';
    throw err;
  }

  const allowedFields = [
    'waste_type',
    'title',
    'description',
    'quantity',
    'unit',
    'price_per_kg',
    'location',
    'image_url',
    'status',
  ];

  const setClauses = [];
  const params = [];

  let newQuantity = updates.quantity !== undefined ? parseFloat(updates.quantity) : existing.quantity;
  let newPrice = updates.price_per_kg !== undefined ? parseFloat(updates.price_per_kg) : existing.price_per_kg;

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      params.push(updates[field]);
    }
  }

  // Recalculate total_price if quantity or price_per_kg was modified
  if (updates.quantity !== undefined || updates.price_per_kg !== undefined) {
    setClauses.push('total_price = ?');
    params.push(parseFloat((newQuantity * newPrice).toFixed(2)));
  }

  if (setClauses.length === 0) {
    return existing;
  }

  params.push(id, userId);
  const query = `UPDATE waste_listings SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`;
  await pool.execute(query, params);

  return getListingById(id);
}

/**
 * Deletes a listing owned by the user.
 */
async function deleteListing(id, userId) {
  const existing = await getListingById(id);
  if (existing.user_id !== userId) {
    const err = new Error('Forbidden: You can only delete your own listings');
    err.code = 'FORBIDDEN';
    throw err;
  }

  await pool.execute('DELETE FROM waste_listings WHERE id = ? AND user_id = ?', [id, userId]);
  return true;
}

module.exports = {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
};
