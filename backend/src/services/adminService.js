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

/**
 * ============================================================================
 * PLATFORM OPERATIONS: SELLERS & VERIFICATION
 * ============================================================================
 */

async function getAdminSellers({ search, kycStatus, page = 1, limit = 20 } = {}) {
  const params = [];
  const conditions = ["u.role = 'seller'"];

  if (search && search.trim()) {
    conditions.push('(u.display_name LIKE ? OR u.email LIKE ? OR u.company_name LIKE ? OR u.phone LIKE ?)');
    const q = `%${search.trim()}%`;
    params.push(q, q, q, q);
  }

  if (kycStatus === 'verified') {
    conditions.push('u.kyc_verified = 1');
  } else if (kycStatus === 'unverified') {
    conditions.push('u.kyc_verified = 0');
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM users u ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (numPage - 1) * numLimit;

  const [rows] = await pool.query(
    `SELECT 
       u.id,
       u.email,
       u.display_name,
       u.company_name,
       u.company_address,
       u.phone,
       u.avatar_url,
       u.kyc_verified,
       u.kyc_notes,
       u.is_active,
       u.created_at,
       u.updated_at,
       (SELECT COUNT(*) FROM waste_listings l WHERE l.user_id = u.id) as listings_count,
       (SELECT COUNT(*) FROM collection_requests r WHERE r.seller_id = u.id) as total_requests_count,
       (SELECT COUNT(*) FROM collection_requests r WHERE r.seller_id = u.id AND r.status = 'delivered') as completed_orders_count,
       (SELECT COALESCE(SUM(r.amount), 0) FROM collection_requests r WHERE r.seller_id = u.id AND r.status = 'delivered') as total_sales_volume,
       (SELECT COALESCE(SUM(r.quantity), 0) FROM collection_requests r WHERE r.seller_id = u.id AND r.status = 'delivered') as total_fulfilled_kg
     FROM users u
     ${where}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, numLimit, offset]
  );

  return {
    sellers: rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.display_name,
      company: r.company_name,
      address: r.company_address,
      phone: r.phone,
      avatar_url: r.avatar_url,
      kyc_verified: Boolean(r.kyc_verified),
      kyc_notes: r.kyc_notes,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      updated_at: r.updated_at,
      listings_count: parseInt(r.listings_count || 0, 10),
      total_requests_count: parseInt(r.total_requests_count || 0, 10),
      completed_orders_count: parseInt(r.completed_orders_count || 0, 10),
      total_sales_volume: parseFloat(r.total_sales_volume || 0),
      total_fulfilled_kg: parseFloat(r.total_fulfilled_kg || 0),
    })),
    total,
    page: numPage,
    limit: numLimit,
    totalPages: Math.ceil(total / numLimit),
  };
}

async function updateSellerVerification(sellerId, adminId, { kyc_verified, kyc_notes }) {
  const [rows] = await pool.execute(
    `SELECT id, role, display_name FROM users WHERE id = ? AND role = 'seller' LIMIT 1`,
    [sellerId]
  );

  if (rows.length === 0) {
    const err = new Error('Seller not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const verifiedVal = kyc_verified ? 1 : 0;
  const notesVal = kyc_notes !== undefined ? kyc_notes : null;

  await pool.execute(
    `UPDATE users 
     SET kyc_verified = ?, 
         kyc_notes = COALESCE(?, kyc_notes), 
         updated_at = NOW() 
     WHERE id = ?`,
    [verifiedVal, notesVal, sellerId]
  );

  const [updated] = await pool.execute(
    `SELECT id, email, display_name, company_name, kyc_verified, kyc_notes, is_active FROM users WHERE id = ?`,
    [sellerId]
  );

  return {
    ...updated[0],
    kyc_verified: Boolean(updated[0].kyc_verified),
    is_active: Boolean(updated[0].is_active),
  };
}

/**
 * ============================================================================
 * PLATFORM OPERATIONS: BUYERS
 * ============================================================================
 */

async function getAdminBuyers({ search, isActive, page = 1, limit = 20 } = {}) {
  const params = [];
  const conditions = ["u.role = 'buyer'"];

  if (search && search.trim()) {
    conditions.push('(u.display_name LIKE ? OR u.email LIKE ? OR u.company_name LIKE ? OR u.phone LIKE ?)');
    const q = `%${search.trim()}%`;
    params.push(q, q, q, q);
  }

  if (isActive === 'active') {
    conditions.push('u.is_active = 1');
  } else if (isActive === 'inactive') {
    conditions.push('u.is_active = 0');
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM users u ${where}`, params);
  const total = countRows[0]?.total || 0;

  const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (numPage - 1) * numLimit;

  const [rows] = await pool.query(
    `SELECT 
       u.id,
       u.email,
       u.display_name,
       u.company_name,
       u.company_address,
       u.phone,
       u.avatar_url,
       u.is_active,
       u.created_at,
       u.updated_at,
       (SELECT COUNT(*) FROM collection_requests r WHERE r.buyer_id = u.id) as orders_count,
       (SELECT COUNT(*) FROM collection_requests r WHERE r.buyer_id = u.id AND r.status = 'delivered') as delivered_orders_count,
       (SELECT COALESCE(SUM(r.amount), 0) FROM collection_requests r WHERE r.buyer_id = u.id AND r.status NOT IN ('cancelled')) as total_ordered_amount,
       (SELECT COALESCE(SUM(r.quantity), 0) FROM collection_requests r WHERE r.buyer_id = u.id AND r.status = 'delivered') as total_purchased_kg
     FROM users u
     ${where}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, numLimit, offset]
  );

  return {
    buyers: rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.display_name,
      company: r.company_name,
      address: r.company_address,
      phone: r.phone,
      avatar_url: r.avatar_url,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      updated_at: r.updated_at,
      orders_count: parseInt(r.orders_count || 0, 10),
      delivered_orders_count: parseInt(r.delivered_orders_count || 0, 10),
      total_ordered_amount: parseFloat(r.total_ordered_amount || 0),
      total_purchased_kg: parseFloat(r.total_purchased_kg || 0),
    })),
    total,
    page: numPage,
    limit: numLimit,
    totalPages: Math.ceil(total / numLimit),
  };
}

/**
 * ============================================================================
 * PLATFORM OPERATIONS: LISTING MANAGEMENT
 * ============================================================================
 */

async function getAdminListings({ search, sellerId, category, status, page = 1, limit = 20 } = {}) {
  const params = [];
  const conditions = [];

  if (search && search.trim()) {
    conditions.push('(l.title LIKE ? OR l.description LIKE ? OR l.location LIKE ? OR s.display_name LIKE ?)');
    const q = `%${search.trim()}%`;
    params.push(q, q, q, q);
  }

  if (sellerId) {
    conditions.push('l.user_id = ?');
    params.push(sellerId);
  }

  if (category && category !== 'All') {
    conditions.push('l.waste_type = ?');
    params.push(category);
  }

  if (status && status !== 'All') {
    conditions.push('l.status = ?');
    params.push(status);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM waste_listings l LEFT JOIN users s ON l.user_id = s.id ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (numPage - 1) * numLimit;

  const [rows] = await pool.query(
    `SELECT 
       l.*,
       s.display_name as seller_name,
       s.email as seller_email,
       s.company_name as seller_company,
       s.kyc_verified as seller_kyc_verified
     FROM waste_listings l
     LEFT JOIN users s ON l.user_id = s.id
     ${where}
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, numLimit, offset]
  );

  return {
    listings: rows.map((r) => ({
      id: r.id,
      title: r.title,
      waste_type: r.waste_type,
      description: r.description,
      quantity: parseFloat(r.quantity || 0),
      available_quantity: parseFloat(r.available_quantity || 0),
      reserved_quantity: parseFloat(r.reserved_quantity || 0),
      fulfilled_quantity: parseFloat(r.fulfilled_quantity || 0),
      unit: r.unit || 'kg',
      price_per_kg: parseFloat(r.price_per_kg || 0),
      total_price: parseFloat(r.total_price || 0),
      location: r.location,
      image_url: r.image_url,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      seller: {
        id: r.user_id,
        name: r.seller_name,
        email: r.seller_email,
        company: r.seller_company,
        kyc_verified: Boolean(r.seller_kyc_verified),
      },
    })),
    total,
    page: numPage,
    limit: numLimit,
    totalPages: Math.ceil(total / numLimit),
  };
}

async function updateListingStatus(listingId, { status }) {
  const [rows] = await pool.execute(`SELECT id FROM waste_listings WHERE id = ? LIMIT 1`, [listingId]);
  if (rows.length === 0) {
    const err = new Error('Listing not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  await pool.execute(
    `UPDATE waste_listings SET status = ?, updated_at = NOW() WHERE id = ?`,
    [status, listingId]
  );

  const [updated] = await pool.execute(`SELECT * FROM waste_listings WHERE id = ?`, [listingId]);
  return updated[0];
}

/**
 * ============================================================================
 * PLATFORM OPERATIONS: INVENTORY OVERVIEW & TRANSACTIONS
 * ============================================================================
 */

async function getAdminInventory({ search, material, page = 1, limit = 20 } = {}) {
  const params = [];
  const conditions = [];

  if (search && search.trim()) {
    conditions.push('(l.title LIKE ? OR s.display_name LIKE ?)');
    const q = `%${search.trim()}%`;
    params.push(q, q);
  }

  if (material && material !== 'All') {
    conditions.push('l.waste_type = ?');
    params.push(material);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // Summary aggregates
  const [summaryRows] = await pool.query(`
    SELECT 
      COALESCE(SUM(quantity), 0) as total_quantity,
      COALESCE(SUM(available_quantity), 0) as total_available,
      COALESCE(SUM(reserved_quantity), 0) as total_reserved,
      COALESCE(SUM(fulfilled_quantity), 0) as total_fulfilled,
      COUNT(*) as total_listings
    FROM waste_listings
  `);
  const summary = summaryRows[0] || {};

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM waste_listings l LEFT JOIN users s ON l.user_id = s.id ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (numPage - 1) * numLimit;

  const [rows] = await pool.query(
    `SELECT 
       l.id,
       l.title,
       l.waste_type,
       l.quantity as total_quantity,
       l.available_quantity,
       l.reserved_quantity,
       l.fulfilled_quantity,
       l.unit,
       l.price_per_kg,
       l.status,
       l.created_at,
       l.updated_at,
       s.display_name as seller_name,
       s.company_name as seller_company
     FROM waste_listings l
     LEFT JOIN users s ON l.user_id = s.id
     ${where}
     ORDER BY l.available_quantity DESC
     LIMIT ? OFFSET ?`,
    [...params, numLimit, offset]
  );

  return {
    summary: {
      total_quantity: parseFloat(summary.total_quantity || 0),
      total_available: parseFloat(summary.total_available || 0),
      total_reserved: parseFloat(summary.total_reserved || 0),
      total_fulfilled: parseFloat(summary.total_fulfilled || 0),
      total_listings: parseInt(summary.total_listings || 0, 10),
    },
    inventory: rows.map((r) => ({
      id: r.id,
      title: r.title,
      waste_type: r.waste_type,
      total_quantity: parseFloat(r.total_quantity || 0),
      available_quantity: parseFloat(r.available_quantity || 0),
      reserved_quantity: parseFloat(r.reserved_quantity || 0),
      fulfilled_quantity: parseFloat(r.fulfilled_quantity || 0),
      unit: r.unit || 'kg',
      price_per_kg: parseFloat(r.price_per_kg || 0),
      status: r.status,
      created_at: r.created_at,
      seller_name: r.seller_name,
      seller_company: r.seller_company,
    })),
    total,
    page: numPage,
    limit: numLimit,
    totalPages: Math.ceil(total / numLimit),
  };
}

async function getInventoryTransactions({ listingId, type, page = 1, limit = 25 } = {}) {
  const params = [];
  const conditions = [];

  if (listingId) {
    conditions.push('it.listing_id = ?');
    params.push(listingId);
  }

  if (type && type !== 'All') {
    conditions.push('it.transaction_type = ?');
    params.push(type);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM inventory_transactions it ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 25));
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (numPage - 1) * numLimit;

  const [rows] = await pool.query(
    `SELECT 
       it.*,
       wl.title as listing_title,
       wl.waste_type,
       u.display_name as actor_name
     FROM inventory_transactions it
     JOIN waste_listings wl ON it.listing_id = wl.id
     LEFT JOIN users u ON it.actor_id = u.id
     ${where}
     ORDER BY it.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, numLimit, offset]
  );

  return {
    transactions: rows.map((r) => ({
      id: r.id,
      listing_id: r.listing_id,
      listing_title: r.listing_title,
      waste_type: r.waste_type,
      order_id: r.order_id,
      transaction_type: r.transaction_type,
      quantity: parseFloat(r.quantity || 0),
      previous_available_quantity: parseFloat(r.previous_available_quantity || 0),
      resulting_available_quantity: parseFloat(r.resulting_available_quantity || 0),
      actor_name: r.actor_name,
      source: r.source,
      note: r.note,
      created_at: r.created_at,
    })),
    total,
    page: numPage,
    limit: numLimit,
    totalPages: Math.ceil(total / numLimit),
  };
}

/**
 * ============================================================================
 * PLATFORM OPERATIONS: PAYMENT MONITORING
 * ============================================================================
 */

async function getAdminPayments({ search, status, page = 1, limit = 20 } = {}) {
  const params = [];
  const conditions = [];

  if (search && search.trim()) {
    conditions.push('(p.id LIKE ? OR p.request_id LIKE ? OR b.display_name LIKE ? OR b.email LIKE ?)');
    const q = `%${search.trim()}%`;
    params.push(q, q, q, q);
  }

  if (status && status !== 'All') {
    conditions.push('p.status = ?');
    params.push(status);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // Payment totals summary
  const [summaryRows] = await pool.query(`
    SELECT 
      COUNT(*) as total_payments,
      SUM(CASE WHEN status = 'SUCCEEDED' THEN 1 ELSE 0 END) as succeeded_count,
      SUM(CASE WHEN status = 'SUCCEEDED' THEN amount ELSE 0 END) as succeeded_amount,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_count,
      COALESCE(SUM(amount), 0) as total_volume
    FROM payments
  `);
  const summary = summaryRows[0] || {};

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total 
     FROM payments p 
     LEFT JOIN collection_requests r ON p.request_id = r.id 
     LEFT JOIN users b ON p.buyer_id = b.id 
     ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (numPage - 1) * numLimit;

  const [rows] = await pool.query(
    `SELECT 
       p.id,
       p.request_id,
       p.buyer_id,
       p.amount,
       p.currency,
       p.status,
       p.payment_method,
       p.paid_at,
       p.created_at,
       p.updated_at,
       b.display_name as buyer_name,
       b.email as buyer_email,
       r.waste_type,
       r.quantity as order_quantity,
       r.seller_id,
       s.display_name as seller_name
     FROM payments p
     LEFT JOIN collection_requests r ON p.request_id = r.id
     LEFT JOIN users b ON p.buyer_id = b.id
     LEFT JOIN users s ON r.seller_id = s.id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, numLimit, offset]
  );

  return {
    summary: {
      total_payments: parseInt(summary.total_payments || 0, 10),
      succeeded_count: parseInt(summary.succeeded_count || 0, 10),
      succeeded_amount: parseFloat(summary.succeeded_amount || 0),
      pending_count: parseInt(summary.pending_count || 0, 10),
      failed_count: parseInt(summary.failed_count || 0, 10),
      total_volume: parseFloat(summary.total_volume || 0),
    },
    payments: rows.map((r) => ({
      id: r.id,
      request_id: r.request_id,
      amount: parseFloat(r.amount || 0),
      currency: r.currency || 'INR',
      status: r.status,
      payment_method: r.payment_method || 'MOCK_GATEWAY',
      paid_at: r.paid_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
      buyer: {
        id: r.buyer_id,
        name: r.buyer_name,
        email: r.buyer_email,
      },
      seller: {
        id: r.seller_id,
        name: r.seller_name,
      },
      order: {
        waste_type: r.waste_type,
        quantity: parseFloat(r.order_quantity || 0),
      },
    })),
    total,
    page: numPage,
    limit: numLimit,
    totalPages: Math.ceil(total / numLimit),
  };
}

/**
 * ============================================================================
 * PLATFORM OPERATIONS: FULFILLMENT MONITORING
 * ============================================================================
 */

async function getAdminFulfillment({ stage, delayedOnly, page = 1, limit = 20 } = {}) {
  const params = [];
  const conditions = [];

  if (stage && stage !== 'All') {
    conditions.push('r.status = ?');
    params.push(stage);
  }

  if (delayedOnly === 'true' || delayedOnly === true) {
    // Orders stuck in transit/confirmed/ready_for_pickup for > 48h
    conditions.push(
      "r.status IN ('confirmed', 'ready_for_pickup', 'in_transit') AND r.updated_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)"
    );
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // Pipeline stage counters
  const [pipelineStats] = await pool.query(`
    SELECT
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'awaiting_payment' THEN 1 ELSE 0 END) as awaiting_payment_count,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
      SUM(CASE WHEN status = 'ready_for_pickup' THEN 1 ELSE 0 END) as ready_for_pickup_count,
      SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit_count,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
      SUM(CASE WHEN status = 'disputed' THEN 1 ELSE 0 END) as disputed_count,
      SUM(CASE WHEN status IN ('confirmed', 'ready_for_pickup', 'in_transit') AND updated_at < DATE_SUB(NOW(), INTERVAL 48 HOUR) THEN 1 ELSE 0 END) as delayed_count
    FROM collection_requests
  `);
  const pipeline = pipelineStats[0] || {};

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM collection_requests r ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (numPage - 1) * numLimit;

  const [rows] = await pool.query(
    `SELECT 
       r.*,
       TIMESTAMPDIFF(HOUR, r.updated_at, NOW()) as hours_in_current_status,
       b.display_name as buyer_name,
       b.company_name as buyer_company,
       s.display_name as seller_name,
       s.company_name as seller_company,
       l.title as listing_title
     FROM collection_requests r
     LEFT JOIN users b ON r.buyer_id = b.id
     LEFT JOIN users s ON r.seller_id = s.id
     LEFT JOIN waste_listings l ON r.listing_id = l.id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, numLimit, offset]
  );

  return {
    pipeline: {
      pending: parseInt(pipeline.pending_count || 0, 10),
      awaiting_payment: parseInt(pipeline.awaiting_payment_count || 0, 10),
      confirmed: parseInt(pipeline.confirmed_count || 0, 10),
      ready_for_pickup: parseInt(pipeline.ready_for_pickup_count || 0, 10),
      in_transit: parseInt(pipeline.in_transit_count || 0, 10),
      delivered: parseInt(pipeline.delivered_count || 0, 10),
      disputed: parseInt(pipeline.disputed_count || 0, 10),
      delayed: parseInt(pipeline.delayed_count || 0, 10),
    },
    orders: rows.map((r) => {
      const hours = parseInt(r.hours_in_current_status || 0, 10);
      const isDelayed = ['confirmed', 'ready_for_pickup', 'in_transit'].includes(r.status) && hours >= 48;

      return {
        id: r.id,
        listing_id: r.listing_id,
        listing_title: r.listing_title,
        waste_type: r.waste_type,
        quantity: parseFloat(r.quantity || 0),
        amount: parseFloat(r.amount || 0),
        status: r.status,
        ready_at: r.ready_at,
        dispatched_at: r.dispatched_at,
        delivered_at: r.delivered_at,
        fulfillment_notes: r.fulfillment_notes,
        hours_in_status: hours,
        is_delayed: isDelayed,
        created_at: r.created_at,
        updated_at: r.updated_at,
        buyer: {
          id: r.buyer_id,
          name: r.buyer_name,
          company: r.buyer_company,
        },
        seller: {
          id: r.seller_id,
          name: r.seller_name,
          company: r.seller_company,
        },
      };
    }),
    total,
    page: numPage,
    limit: numLimit,
    totalPages: Math.ceil(total / numLimit),
  };
}

/**
 * ============================================================================
 * INSIGHTS & SYSTEM: PLATFORM ANALYTICS
 * ============================================================================
 */

async function getAdminAnalytics() {
  // 1. Daily order trend over last 14 days
  const [dailyRows] = await pool.query(`
    SELECT 
      DATE(created_at) as date_val,
      COUNT(*) as orders_count,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
      COALESCE(SUM(amount), 0) as total_volume
    FROM collection_requests
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date_val ASC
  `);

  // 2. Material / waste type distribution
  const [categoryRows] = await pool.query(`
    SELECT 
      waste_type,
      COUNT(*) as total_orders,
      COALESCE(SUM(quantity), 0) as total_quantity_kg,
      COALESCE(SUM(amount), 0) as total_amount
    FROM collection_requests
    GROUP BY waste_type
    ORDER BY total_quantity_kg DESC
  `);

  // 3. Dispute distribution by status and reason
  const [disputeRows] = await pool.query(`
    SELECT 
      status,
      COUNT(*) as count
    FROM order_disputes
    GROUP BY status
  `);

  // 4. User distribution
  const [userRoleRows] = await pool.query(`
    SELECT 
      role,
      COUNT(*) as count,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count
    FROM users
    GROUP BY role
  `);

  return {
    daily_trends: dailyRows.map((r) => ({
      date: r.date_val,
      orders: parseInt(r.orders_count || 0, 10),
      delivered: parseInt(r.delivered_count || 0, 10),
      cancelled: parseInt(r.cancelled_count || 0, 10),
      volume: parseFloat(r.total_volume || 0),
    })),
    category_distribution: categoryRows.map((r) => ({
      waste_type: r.waste_type,
      orders: parseInt(r.total_orders || 0, 10),
      quantity_kg: parseFloat(r.total_quantity_kg || 0),
      amount: parseFloat(r.total_amount || 0),
    })),
    dispute_distribution: disputeRows.map((r) => ({
      status: r.status,
      count: parseInt(r.count || 0, 10),
    })),
    user_distribution: userRoleRows.map((r) => ({
      role: r.role,
      count: parseInt(r.count || 0, 10),
      active: parseInt(r.active_count || 0, 10),
    })),
  };
}

/**
 * ============================================================================
 * INSIGHTS & SYSTEM: GLOBAL ACTIVITY LOGS
 * ============================================================================
 */

async function getAdminActivityLogs({ page = 1, limit = 30 } = {}) {
  const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 30));
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (numPage - 1) * numLimit;

  // Union of fulfillment activity, dispute activity, and payment transitions
  const unionQuery = `
    SELECT 
      CONCAT('ful_', id) as log_id,
      'FULFILLMENT' as category,
      request_id as reference_id,
      changed_by as actor_id,
      actor_role,
      CONCAT('Status moved from ', COALESCE(previous_status, 'none'), ' to ', new_status) as action,
      notes,
      created_at
    FROM order_fulfillment_activity

    UNION ALL

    SELECT 
      CONCAT('dsp_', id) as log_id,
      'DISPUTE' as category,
      dispute_id as reference_id,
      actor_id,
      actor_role,
      action,
      notes,
      created_at
    FROM dispute_activity

    UNION ALL

    SELECT 
      CONCAT('pay_', id) as log_id,
      'PAYMENT' as category,
      payment_id as reference_id,
      actor_id,
      'buyer' as actor_role,
      CONCAT('Payment event: ', event_type, ' (', COALESCE(previous_status, 'none'), ' -> ', resulting_status, ')') as action,
      note as notes,
      created_at
    FROM payment_transactions
  `;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM (${unionQuery}) as all_logs`
  );
  const total = countRows[0]?.total || 0;

  const [rows] = await pool.query(
    `SELECT 
       l.*,
       u.display_name as actor_name,
       u.email as actor_email
     FROM (${unionQuery}) as l
     LEFT JOIN users u ON l.actor_id = u.id
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?`,
    [numLimit, offset]
  );

  return {
    logs: rows.map((r) => ({
      id: r.log_id,
      category: r.category,
      reference_id: r.reference_id,
      actor_id: r.actor_id,
      actor_name: r.actor_name || 'System / Automated',
      actor_email: r.actor_email,
      actor_role: r.actor_role,
      action: r.action,
      notes: r.notes,
      created_at: r.created_at,
    })),
    total,
    page: numPage,
    limit: numLimit,
    totalPages: Math.ceil(total / numLimit),
  };
}

/**
 * ============================================================================
 * INSIGHTS & SYSTEM: SYSTEM SETTINGS
 * ============================================================================
 */

async function getSystemSettings() {
  const [rows] = await pool.query(`SELECT key_name, value_text, description, updated_at FROM system_settings ORDER BY key_name ASC`);
  const settings = {};
  for (const r of rows) {
    settings[r.key_name] = {
      value: r.value_text,
      description: r.description,
      updated_at: r.updated_at,
    };
  }
  return settings;
}

async function updateSystemSettings(updates) {
  // Safe whitelist of configurable keys
  const allowedKeys = [
    'platform_name',
    'support_email',
    'default_order_timeout_hours',
    'dispute_escalation_days',
    'min_order_quantity_kg',
    'maintenance_mode',
  ];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedKeys.includes(key)) {
      await pool.execute(
        `UPDATE system_settings SET value_text = ?, updated_at = NOW() WHERE key_name = ?`,
        [String(value).trim(), key]
      );
    }
  }

  return getSystemSettings();
}

module.exports = {
  getAdminStats,
  getAdminOrders,
  getAdminOrderById,
  getAdminUsers,
  getAdminUserById,
  updateUserStatus,
  // New platform operations & system services
  getAdminSellers,
  updateSellerVerification,
  getAdminBuyers,
  getAdminListings,
  updateListingStatus,
  getAdminInventory,
  getInventoryTransactions,
  getAdminPayments,
  getAdminFulfillment,
  getAdminAnalytics,
  getAdminActivityLogs,
  getSystemSettings,
  updateSystemSettings,
};
