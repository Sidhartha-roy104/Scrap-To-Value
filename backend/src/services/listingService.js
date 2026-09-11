/**
 * services/listingService.js
 * --------------------------
 * Business logic for waste listings connected to MySQL.
 */

const crypto = require('crypto');
const { pool } = require('../config/db');

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
  return {
    id: row.id,
    user_id: row.user_id,
    waste_type: row.waste_type,
    title: row.title,
    description: row.description ?? null,
    quantity: parseFloat(row.quantity),
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
      quantity, unit, price_per_kg, total_price,
      location, image_url, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await pool.execute(query, [
    id,
    userId,
    waste_type,
    title,
    description,
    numQty,
    unit,
    numPrice,
    total_price,
    location,
    image_url,
    status,
  ]);

  return getListingById(id);
}

/**
 * Retrieves listings with optional filters, search, and pagination.
 */
async function getListings({
  waste_type,
  location,
  status = 'Available',
  search,
  user_id,
  page = 1,
  limit = 50,
} = {}) {
  const conditions = [];
  const params = [];

  if (status && status !== 'All') {
    conditions.push('l.status = ?');
    params.push(status);
  }

  if (waste_type && waste_type !== 'All') {
    conditions.push('l.waste_type = ?');
    params.push(waste_type);
  }

  if (location && location !== 'All') {
    conditions.push('l.location LIKE ?');
    params.push(`%${location}%`);
  }

  if (user_id) {
    conditions.push('l.user_id = ?');
    params.push(user_id);
  }

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    conditions.push('(l.title LIKE ? OR l.description LIKE ? OR l.location LIKE ? OR l.waste_type LIKE ?)');
    params.push(s, s, s, s);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM waste_listings l ${whereClause}`;
  const [countResult] = await pool.execute(countQuery, params);
  const total = countResult[0]?.total || 0;

  // Pagination
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const query = `
    SELECT 
      l.*,
      u.display_name as seller_name,
      u.company_name as seller_company,
      u.phone as seller_phone,
      u.avatar_url as seller_avatar
    FROM waste_listings l
    LEFT JOIN users u ON l.user_id = u.id
    ${whereClause}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `;

  // Note: mysql2 execute with LIMIT/OFFSET expects strings or numbers in query()
  const [rows] = await pool.query(query, [...params, parseInt(limit, 10), offset]);

  return {
    listings: rows.map((row) => formatListing(row)),
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages: Math.ceil(total / limit),
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
      u.avatar_url as seller_avatar
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
