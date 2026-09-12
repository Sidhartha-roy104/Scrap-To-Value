/**
 * services/adminService.js
 * ------------------------
 * Business logic for platform administration, metrics, and operations.
 * Strictly requires admin authorization at the route level.
 */

const { pool } = require('../config/db');

/**
 * Retrieves aggregate platform statistics from real MySQL database data.
 */
async function getAdminStats() {
  // 1. User metrics
  const [userStats] = await pool.execute(`
    SELECT
      COUNT(*) as total_users,
      SUM(CASE WHEN role = 'buyer' THEN 1 ELSE 0 END) as total_buyers,
      SUM(CASE WHEN role = 'seller' THEN 1 ELSE 0 END) as total_sellers,
      SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as total_admins,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
      SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_users
    FROM users
  `);

  // 2. Order/Request metrics
  const [orderStats] = await pool.execute(`
    SELECT
      COUNT(*) as total_orders,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
      SUM(CASE WHEN status = 'awaiting_payment' THEN 1 ELSE 0 END) as awaiting_payment_orders,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_orders,
      SUM(CASE WHEN status = 'ready_for_pickup' THEN 1 ELSE 0 END) as ready_for_pickup_orders,
      SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit_orders,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
      SUM(CASE WHEN status = 'disputed' THEN 1 ELSE 0 END) as disputed_orders,
      SUM(CASE WHEN status = 'delivered' THEN quantity ELSE 0 END) as total_fulfilled_quantity,
      SUM(CASE WHEN status NOT IN ('cancelled') THEN amount ELSE 0 END) as total_order_volume
    FROM collection_requests
  `);

  // 3. Payment metrics
  const [paymentStats] = await pool.execute(`
    SELECT
      COUNT(*) as total_payments,
      SUM(CASE WHEN status = 'SUCCEEDED' THEN 1 ELSE 0 END) as succeeded_payments,
      SUM(CASE WHEN status = 'SUCCEEDED' THEN amount ELSE 0 END) as total_succeeded_amount,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_payments,
      SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_payments
    FROM payments
  `);

  // 4. Dispute metrics
  const [disputeStats] = await pool.execute(`
    SELECT
      COUNT(*) as total_disputes,
      SUM(CASE WHEN status IN ('open', 'under_review') THEN 1 ELSE 0 END) as active_disputes,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_disputes,
      SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review_disputes,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_disputes,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_disputes,
      SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_disputes
    FROM order_disputes
  `);

  // 5. Waste listing metrics
  const [listingStats] = await pool.execute(`
    SELECT
      COUNT(*) as total_listings,
      SUM(available_quantity) as total_available_quantity,
      SUM(reserved_quantity) as total_reserved_quantity,
      SUM(fulfilled_quantity) as total_fulfilled_quantity
    FROM waste_listings
  `);

  const u = userStats[0] || {};
  const o = orderStats[0] || {};
  const p = paymentStats[0] || {};
  const d = disputeStats[0] || {};
  const l = listingStats[0] || {};

  return {
    total_users: parseInt(u.total_users || 0, 10),
    total_buyers: parseInt(u.total_buyers || 0, 10),
    total_sellers: parseInt(u.total_sellers || 0, 10),
    total_admins: parseInt(u.total_admins || 0, 10),
    total_requests: parseInt(o.total_orders || 0, 10),
    pending_requests: parseInt(o.pending_orders || 0, 10),
    awaiting_payment_orders: parseInt(o.awaiting_payment_orders || 0, 10),
    confirmed_orders: parseInt(o.confirmed_orders || 0, 10),
    ready_for_pickup_orders: parseInt(o.ready_for_pickup_orders || 0, 10),
    in_transit_orders: parseInt(o.in_transit_orders || 0, 10),
    delivered_orders: parseInt(o.delivered_orders || 0, 10),
    cancelled_orders: parseInt(o.cancelled_orders || 0, 10),
    disputed_orders: parseInt(o.disputed_orders || 0, 10),
    total_fulfilled_quantity_kg: parseFloat(o.total_fulfilled_quantity || 0),
    total_order_volume: parseFloat(o.total_order_volume || 0),
    total_disputes: parseInt(d.total_disputes || 0, 10),
    open_disputes: parseInt(d.open_disputes || 0, 10),
    users: {
      total: parseInt(u.total_users || 0, 10),
      buyers: parseInt(u.total_buyers || 0, 10),
      sellers: parseInt(u.total_sellers || 0, 10),
      admins: parseInt(u.total_admins || 0, 10),
      active: parseInt(u.active_users || 0, 10),
      inactive: parseInt(u.inactive_users || 0, 10),
    },
    orders: {
      total: parseInt(o.total_orders || 0, 10),
      pending: parseInt(o.pending_orders || 0, 10),
      awaiting_payment: parseInt(o.awaiting_payment_orders || 0, 10),
      confirmed: parseInt(o.confirmed_orders || 0, 10),
      ready_for_pickup: parseInt(o.ready_for_pickup_orders || 0, 10),
      in_transit: parseInt(o.in_transit_orders || 0, 10),
      delivered: parseInt(o.delivered_orders || 0, 10),
      cancelled: parseInt(o.cancelled_orders || 0, 10),
      disputed: parseInt(o.disputed_orders || 0, 10),
      total_fulfilled_quantity: parseFloat(o.total_fulfilled_quantity || 0),
      total_order_volume: parseFloat(o.total_order_volume || 0),
    },
    payments: {
      total: parseInt(p.total_payments || 0, 10),
      succeeded: parseInt(p.succeeded_payments || 0, 10),
      total_succeeded_amount: parseFloat(p.total_succeeded_amount || 0),
      pending: parseInt(p.pending_payments || 0, 10),
      failed: parseInt(p.failed_payments || 0, 10),
    },
    disputes: {
      total: parseInt(d.total_disputes || 0, 10),
      active: parseInt(d.active_disputes || 0, 10),
      open: parseInt(d.open_disputes || 0, 10),
      under_review: parseInt(d.under_review_disputes || 0, 10),
      resolved: parseInt(d.resolved_disputes || 0, 10),
      rejected: parseInt(d.rejected_disputes || 0, 10),
      closed: parseInt(d.closed_disputes || 0, 10),
    },
    inventory: {
      total_listings: parseInt(l.total_listings || 0, 10),
      available_quantity: parseFloat(l.total_available_quantity || 0),
      reserved_quantity: parseFloat(l.total_reserved_quantity || 0),
      fulfilled_quantity: parseFloat(l.total_fulfilled_quantity || 0),
    },
  };
}

/**
 * Retrieves all collection requests across the platform with filtering and pagination.
 */
async function getAdminOrders({
  search,
  status,
  dateFrom,
  dateTo,
  buyerId,
  sellerId,
  page = 1,
  limit = 20,
} = {}) {
  const conditions = [];
  const params = [];

  if (status && status !== 'All') {
    conditions.push('r.status = ?');
    params.push(status);
  }

  if (buyerId) {
    conditions.push('r.buyer_id = ?');
    params.push(buyerId);
  }

  if (sellerId) {
    conditions.push('r.seller_id = ?');
    params.push(sellerId);
  }

  if (dateFrom) {
    conditions.push('r.created_at >= ?');
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push('r.created_at <= ?');
    params.push(dateTo);
  }

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push('(r.id LIKE ? OR l.title LIKE ? OR b.display_name LIKE ? OR s.display_name LIKE ? OR r.waste_type LIKE ?)');
    params.push(q, q, q, q, q);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matching
  const countQuery = `
    SELECT COUNT(*) as total
    FROM collection_requests r
    LEFT JOIN waste_listings l ON r.listing_id = l.id
    LEFT JOIN users b ON r.buyer_id = b.id
    LEFT JOIN users s ON r.seller_id = s.id
    ${whereClause}
  `;
  const [countRows] = await pool.execute(countQuery, params);
  const total = countRows[0]?.total || 0;

  const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * numLimit;

  const query = `
    SELECT
      r.*,
      l.title as listing_title,
      l.unit as listing_unit,
      l.image_url as listing_image_url,
      l.available_quantity as listing_available_quantity,
      l.reserved_quantity as listing_reserved_quantity,
      res.status as reservation_status,
      res.reserved_quantity as reservation_quantity,
      p.id as payment_id,
      p.status as payment_status,
      p.amount as payment_amount,
      p.payment_method as payment_method,
      p.paid_at as payment_paid_at,
      b.display_name as buyer_name,
      b.email as buyer_email,
      b.company_name as buyer_company,
      s.display_name as seller_name,
      s.email as seller_email,
      s.company_name as seller_company,
      (SELECT COUNT(*) FROM order_disputes d WHERE d.request_id = r.id) as dispute_count
    FROM collection_requests r
    LEFT JOIN waste_listings l ON r.listing_id = l.id
    LEFT JOIN inventory_reservations res ON r.id = res.order_id
    LEFT JOIN payments p ON p.id = (
      SELECT id FROM payments WHERE request_id = r.id ORDER BY created_at DESC LIMIT 1
    )
    LEFT JOIN users b ON r.buyer_id = b.id
    LEFT JOIN users s ON r.seller_id = s.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(query, [...params, numLimit, offset]);

  return {
    orders: rows.map((row) => ({
      id: row.id,
      listing_id: row.listing_id,
      buyer_id: row.buyer_id,
      seller_id: row.seller_id,
      waste_type: row.waste_type,
      quantity: parseFloat(row.quantity),
      price_per_kg: parseFloat(row.price_per_kg),
      amount: parseFloat(row.amount),
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      ready_at: row.ready_at,
      dispatched_at: row.dispatched_at,
      delivered_at: row.delivered_at,
      fulfillment_notes: row.fulfillment_notes,
      buyer_message: row.buyer_message,
      dispute_count: parseInt(row.dispute_count || 0, 10),
      listing: {
        id: row.listing_id,
        title: row.listing_title,
        unit: row.listing_unit || 'kg',
        image_url: row.listing_image_url,
      },
      buyer: {
        id: row.buyer_id,
        name: row.buyer_name,
        email: row.buyer_email,
        company: row.buyer_company,
      },
      seller: {
        id: row.seller_id,
        name: row.seller_name,
        email: row.seller_email,
        company: row.seller_company,
      },
      reservation: row.reservation_status
        ? {
            status: row.reservation_status,
            reserved_quantity: parseFloat(row.reservation_quantity || row.quantity),
          }
        : undefined,
      payment: row.payment_status
        ? {
            id: row.payment_id,
            status: row.payment_status,
            amount: parseFloat(row.payment_amount || row.amount),
            payment_method: row.payment_method,
            paid_at: row.payment_paid_at,
          }
        : undefined,
    })),
    total,
    page: parseInt(page, 10),
    limit: numLimit,
    totalPages: Math.ceil(total / numLimit),
  };
}

/**
 * Retrieves full single order details with complete audit trail and dispute logs for Admin inspection.
 */
async function getAdminOrderById(id) {
  const query = `
    SELECT
      r.*,
      l.title as listing_title,
      l.unit as listing_unit,
      l.image_url as listing_image_url,
      l.available_quantity as listing_available_quantity,
      l.reserved_quantity as listing_reserved_quantity,
      l.fulfilled_quantity as listing_fulfilled_quantity,
      l.location as listing_location,
      res.status as reservation_status,
      res.reserved_quantity as reservation_quantity,
      p.id as payment_id,
      p.status as payment_status,
      p.amount as payment_amount,
      p.payment_method as payment_method,
      p.paid_at as payment_paid_at,
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
    LEFT JOIN inventory_reservations res ON r.id = res.order_id
    LEFT JOIN payments p ON p.id = (
      SELECT id FROM payments WHERE request_id = r.id ORDER BY created_at DESC LIMIT 1
    )
    LEFT JOIN users b ON r.buyer_id = b.id
    LEFT JOIN users s ON r.seller_id = s.id
    WHERE r.id = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(query, [id]);
  if (rows.length === 0) {
    const err = new Error('Order not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const row = rows[0];

  // Fetch fulfillment activity log
  const [activities] = await pool.execute(
    `SELECT a.*, u.display_name as actor_name, u.role as user_role
     FROM order_fulfillment_activity a
     LEFT JOIN users u ON a.changed_by = u.id
     WHERE a.request_id = ?
     ORDER BY a.created_at ASC`,
    [id]
  );

  // Fetch disputes associated with this order
  const [disputes] = await pool.execute(
    `SELECT d.*, u.display_name as raised_by_name
     FROM order_disputes d
     LEFT JOIN users u ON d.raised_by = u.id
     WHERE d.request_id = ?
     ORDER BY d.created_at DESC`,
    [id]
  );

  let trackingUpdates = [];
  try {
    trackingUpdates = typeof row.tracking_updates === 'string'
      ? JSON.parse(row.tracking_updates)
      : row.tracking_updates || [];
  } catch {
    trackingUpdates = [];
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
    buyer_message: row.buyer_message,
    status: row.status,
    tracking_updates: trackingUpdates,
    estimated_delivery: row.estimated_delivery,
    ready_at: row.ready_at,
    dispatched_at: row.dispatched_at,
    delivered_at: row.delivered_at,
    fulfillment_notes: row.fulfillment_notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    listing: {
      id: row.listing_id,
      title: row.listing_title,
      unit: row.listing_unit || 'kg',
      image_url: row.listing_image_url,
      location: row.listing_location,
      available_quantity: parseFloat(row.listing_available_quantity || 0),
      reserved_quantity: parseFloat(row.listing_reserved_quantity || 0),
      fulfilled_quantity: parseFloat(row.listing_fulfilled_quantity || 0),
    },
    buyer: {
      id: row.buyer_id,
      name: row.buyer_name,
      email: row.buyer_email,
      company: row.buyer_company,
      phone: row.buyer_phone,
    },
    seller: {
      id: row.seller_id,
      name: row.seller_name,
      email: row.seller_email,
      company: row.seller_company,
      phone: row.seller_phone,
    },
    reservation: row.reservation_status
      ? {
          status: row.reservation_status,
          reserved_quantity: parseFloat(row.reservation_quantity || row.quantity),
        }
      : undefined,
    payment: row.payment_status
      ? {
          id: row.payment_id,
          status: row.payment_status,
          amount: parseFloat(row.payment_amount || row.amount),
          payment_method: row.payment_method,
          paid_at: row.payment_paid_at,
        }
      : undefined,
    fulfillment_activity: activities,
    disputes,
  };
}

/**
 * Retrieves users across the platform with role/status filters and activity counters.
 */
async function getAdminUsers({
  search,
  role,
  status,
  page = 1,
  limit = 20,
} = {}) {
  const conditions = [];
  const params = [];

  if (role && role !== 'All') {
    conditions.push('u.role = ?');
    params.push(role);
  }

  if (status !== undefined && status !== 'All') {
    if (status === 'active') {
      conditions.push('u.is_active = 1');
    } else if (status === 'inactive') {
      conditions.push('u.is_active = 0');
    }
  }

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push('(u.email LIKE ? OR u.display_name LIKE ? OR u.company_name LIKE ? OR u.phone LIKE ?)');
    params.push(q, q, q, q);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
  const [countRows] = await pool.execute(countQuery, params);
  const total = countRows[0]?.total || 0;

  const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * numLimit;

  const query = `
    SELECT
      u.id,
      u.email,
      u.role,
      u.display_name,
      u.company_name,
      u.company_address,
      u.phone,
      u.avatar_url,
      u.kyc_verified,
      u.is_active,
      u.created_at,
      u.updated_at,
      (SELECT COUNT(*) FROM waste_listings l WHERE l.user_id = u.id) as listing_count,
      (SELECT COUNT(*) FROM collection_requests r WHERE r.buyer_id = u.id) as buyer_order_count,
      (SELECT COUNT(*) FROM collection_requests r WHERE r.seller_id = u.id) as seller_order_count
    FROM users u
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(query, [...params, numLimit, offset]);

  return {
    users: rows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      full_name: row.display_name,
      company_name: row.company_name,
      company_address: row.company_address,
      phone: row.phone,
      avatar_url: row.avatar_url,
      kyc_verified: Boolean(row.kyc_verified),
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
      listing_count: parseInt(row.listing_count || 0, 10),
      buyer_order_count: parseInt(row.buyer_order_count || 0, 10),
      seller_order_count: parseInt(row.seller_order_count || 0, 10),
    })),
    total,
    page: parseInt(page, 10),
    limit: numLimit,
    totalPages: Math.ceil(total / numLimit),
  };
}

/**
 * Retrieves a single user profile with activity stats.
 */
async function getAdminUserById(id) {
  const [rows] = await pool.execute(
    `SELECT
      u.id,
      u.email,
      u.role,
      u.display_name,
      u.company_name,
      u.company_address,
      u.phone,
      u.avatar_url,
      u.kyc_verified,
      u.is_active,
      u.created_at,
      u.updated_at,
      (SELECT COUNT(*) FROM waste_listings l WHERE l.user_id = u.id) as listing_count,
      (SELECT COUNT(*) FROM collection_requests r WHERE r.buyer_id = u.id) as buyer_order_count,
      (SELECT COUNT(*) FROM collection_requests r WHERE r.seller_id = u.id) as seller_order_count
    FROM users u
    WHERE u.id = ?
    LIMIT 1`,
    [id]
  );

  if (rows.length === 0) {
    const err = new Error('User not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const row = rows[0];
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    full_name: row.display_name,
    company_name: row.company_name,
    company_address: row.company_address,
    phone: row.phone,
    avatar_url: row.avatar_url,
    kyc_verified: Boolean(row.kyc_verified),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
    listing_count: parseInt(row.listing_count || 0, 10),
    buyer_order_count: parseInt(row.buyer_order_count || 0, 10),
    seller_order_count: parseInt(row.seller_order_count || 0, 10),
  };
}

/**
 * Toggles user active status (soft-disable/enable).
 * Safeguard: Admin cannot deactivate their own account.
 */
async function updateUserStatus(userId, adminId, { is_active }) {
  if (userId === adminId) {
    const err = new Error('Forbidden: Administrators cannot deactivate their own account.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  const user = await getAdminUserById(userId);
  const newStatus = is_active ? 1 : 0;

  await pool.execute(
    'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
    [newStatus, userId]
  );

  return getAdminUserById(userId);
}

module.exports = {
  getAdminStats,
  getAdminOrders,
  getAdminOrderById,
  getAdminUsers,
  getAdminUserById,
  updateUserStatus,
};
