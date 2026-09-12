/**
 * services/disputeService.js
 * --------------------------
 * Business logic for dispute raising, admin resolution, and audit ledger tracking.
 */

const crypto = require('crypto');
const { pool } = require('../config/db');
const notificationService = require('./notificationService');

const VALID_DISPUTE_STATUSES = ['open', 'under_review', 'resolved', 'rejected', 'closed'];

/**
 * Creates a new dispute for a collection request / order.
 * Can be raised by authorized buyer or seller.
 */
async function createDispute({
  requestId,
  userId,
  userRole,
  reason,
  description = null,
}) {
  if (!reason || !reason.trim()) {
    const err = new Error('Dispute reason is required.');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  // 1. Fetch order and check authorization
  const [orderRows] = await pool.execute(
    'SELECT * FROM collection_requests WHERE id = ?',
    [requestId]
  );
  if (orderRows.length === 0) {
    const err = new Error('Order not found.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const order = orderRows[0];

  // Authorization: Only the buyer or seller of the order can raise a dispute
  if (order.buyer_id !== userId && order.seller_id !== userId) {
    const err = new Error('Forbidden: You can only raise disputes for orders you are directly involved in.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  const effectiveRole = order.buyer_id === userId ? 'buyer' : 'seller';

  // 2. Prevent duplicate active disputes for the same order
  const [activeDisputes] = await pool.execute(
    `SELECT id FROM order_disputes 
     WHERE request_id = ? AND status IN ('open', 'under_review')`,
    [requestId]
  );
  if (activeDisputes.length > 0) {
    const err = new Error('An active dispute is already open or under review for this order.');
    err.code = 'DUPLICATE_DISPUTE';
    throw err;
  }

  const disputeId = crypto.randomUUID();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 3. Insert dispute record
    await connection.execute(
      `INSERT INTO order_disputes (
        id, request_id, raised_by, user_role, reason, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'open')`,
      [disputeId, requestId, userId, effectiveRole, reason.trim(), description ? description.trim() : null]
    );

    // 4. Log dispute activity
    const actId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO dispute_activity (
        id, dispute_id, actor_id, actor_role, action, previous_status, new_status, notes
      ) VALUES (?, ?, ?, ?, 'DISPUTE_RAISED', NULL, 'open', ?)`,
      [actId, disputeId, userId, effectiveRole, `Dispute raised: ${reason.trim()}`]
    );

    // 5. Update order status to 'disputed' if not already disputed
    if (order.status !== 'disputed') {
      let currentTracking = [];
      try {
        currentTracking = typeof order.tracking_updates === 'string'
          ? JSON.parse(order.tracking_updates)
          : order.tracking_updates || [];
      } catch {
        currentTracking = [];
      }

      currentTracking.push({
        status: 'disputed',
        timestamp: new Date().toISOString(),
        note: `Dispute opened by ${effectiveRole}: ${reason.trim()}`,
      });

      await connection.execute(
        `UPDATE collection_requests 
         SET status = 'disputed', tracking_updates = ? 
         WHERE id = ?`,
        [JSON.stringify(currentTracking), requestId]
      );

      // Log to fulfillment activity as well
      const fulfillmentActId = crypto.randomUUID();
      await connection.execute(
        `INSERT INTO order_fulfillment_activity (
          id, request_id, previous_status, new_status, changed_by, actor_role, notes
        ) VALUES (?, ?, ?, 'disputed', ?, ?, ?)`,
        [
          fulfillmentActId,
          requestId,
          order.status,
          userId,
          effectiveRole,
          `Dispute raised: ${reason.trim()}`,
        ]
      );
    }

    await connection.commit();

    // Notify opposing party
    const opposingRecipient = effectiveRole === 'buyer' ? order.seller_id : order.buyer_id;
    if (opposingRecipient) {
      notificationService.createNotification({
        recipientId: opposingRecipient,
        type: notificationService.NotificationTypes.DISPUTE_RAISED,
        title: `Dispute Raised on Order #${requestId.slice(0, 8).toUpperCase()}`,
        message: `The ${effectiveRole} raised a dispute for reason: "${reason.trim()}". Our compliance team has been alerted.`,
        relatedRequestId: requestId,
        relatedDisputeId: disputeId,
        relatedEntityType: 'dispute',
        relatedEntityId: disputeId,
        link: '/orders',
        dedupKey: `dispute:RAISED_OPPOSING:${disputeId}`,
      });
    }

    // Operational Alert: Broadcast to all administrators
    notificationService.notifyAdmins({
      type: notificationService.NotificationTypes.ADMIN_ALERT,
      title: `New Dispute: Order #${requestId.slice(0, 8).toUpperCase()}`,
      message: `${effectiveRole.toUpperCase()} filed a dispute: "${reason.trim()}". Requires compliance review.`,
      link: '/admin/disputes',
      relatedEntityId: disputeId,
      relatedEntityType: 'dispute',
      dedupKey: `dispute:RAISED_ADMIN:${disputeId}`,
    });
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return getDisputeById(disputeId, userId, userRole);
}

/**
 * Retrieves list of disputes with optional status filter and role-based scoping.
 */
async function getDisputes({
  userId,
  userRole,
  status,
  requestId,
  page = 1,
  limit = 20,
} = {}) {
  const conditions = [];
  const params = [];

  // Role scoping: Admin sees all; buyer/seller only see their own disputes or disputes for their orders
  if (userRole !== 'admin') {
    conditions.push('(d.raised_by = ? OR r.buyer_id = ? OR r.seller_id = ?)');
    params.push(userId, userId, userId);
  }

  if (status && status !== 'All') {
    conditions.push('d.status = ?');
    params.push(status);
  }

  if (requestId) {
    conditions.push('d.request_id = ?');
    params.push(requestId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*) as total 
    FROM order_disputes d
    LEFT JOIN collection_requests r ON d.request_id = r.id
    ${whereClause}
  `;
  const [countRows] = await pool.execute(countQuery, params);
  const total = countRows[0]?.total || 0;

  const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * numLimit;

  const query = `
    SELECT
      d.*,
      u.display_name as raised_by_name,
      u.email as raised_by_email,
      adm.display_name as resolved_by_name,
      r.waste_type,
      r.quantity as order_quantity,
      r.amount as order_amount,
      r.status as order_status,
      l.title as listing_title,
      b.display_name as buyer_name,
      s.display_name as seller_name
    FROM order_disputes d
    LEFT JOIN users u ON d.raised_by = u.id
    LEFT JOIN users adm ON d.resolved_by = adm.id
    LEFT JOIN collection_requests r ON d.request_id = r.id
    LEFT JOIN waste_listings l ON r.listing_id = l.id
    LEFT JOIN users b ON r.buyer_id = b.id
    LEFT JOIN users s ON r.seller_id = s.id
    ${whereClause}
    ORDER BY d.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(query, [...params, numLimit, offset]);

  return {
    disputes: rows.map((row) => ({
      id: row.id,
      request_id: row.request_id,
      raised_by: row.raised_by,
      user_role: row.user_role,
      reason: row.reason,
      description: row.description,
      status: row.status,
      admin_resolution: row.admin_resolution,
      admin_notes: row.admin_notes,
      resolved_by: row.resolved_by,
      resolved_at: row.resolved_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      raised_by_user: {
        id: row.raised_by,
        name: row.raised_by_name,
        email: row.raised_by_email,
      },
      resolved_by_user: row.resolved_by
        ? {
            id: row.resolved_by,
            name: row.resolved_by_name,
          }
        : null,
      order: {
        id: row.request_id,
        waste_type: row.waste_type,
        quantity: parseFloat(row.order_quantity || 0),
        amount: parseFloat(row.order_amount || 0),
        status: row.order_status,
        listing_title: row.listing_title,
        buyer_name: row.buyer_name,
        seller_name: row.seller_name,
      },
    })),
    total,
    page: parseInt(page, 10),
    limit: numLimit,
    totalPages: Math.ceil(total / numLimit),
  };
}

/**
 * Retrieves a single dispute with full details and activity history.
 */
async function getDisputeById(id, userId, userRole) {
  const query = `
    SELECT
      d.*,
      u.display_name as raised_by_name,
      u.email as raised_by_email,
      adm.display_name as resolved_by_name,
      r.buyer_id,
      r.seller_id,
      r.waste_type,
      r.quantity as order_quantity,
      r.amount as order_amount,
      r.status as order_status,
      l.title as listing_title,
      b.display_name as buyer_name,
      b.email as buyer_email,
      s.display_name as seller_name,
      s.email as seller_email
    FROM order_disputes d
    LEFT JOIN users u ON d.raised_by = u.id
    LEFT JOIN users adm ON d.resolved_by = adm.id
    LEFT JOIN collection_requests r ON d.request_id = r.id
    LEFT JOIN waste_listings l ON r.listing_id = l.id
    LEFT JOIN users b ON r.buyer_id = b.id
    LEFT JOIN users s ON r.seller_id = s.id
    WHERE d.id = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(query, [id]);
  if (rows.length === 0) {
    const err = new Error('Dispute not found.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const row = rows[0];

  // Authorization check for non-admin
  if (userRole !== 'admin' && row.raised_by !== userId && row.buyer_id !== userId && row.seller_id !== userId) {
    const err = new Error('Forbidden: Access denied to this dispute.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  // Fetch dispute audit activity
  const [activities] = await pool.execute(
    `SELECT a.*, u.display_name as actor_name
     FROM dispute_activity a
     LEFT JOIN users u ON a.actor_id = u.id
     WHERE a.dispute_id = ?
     ORDER BY a.created_at ASC`,
    [id]
  );

  return {
    id: row.id,
    request_id: row.request_id,
    raised_by: row.raised_by,
    user_role: row.user_role,
    reason: row.reason,
    description: row.description,
    status: row.status,
    admin_resolution: row.admin_resolution,
    admin_notes: row.admin_notes,
    resolved_by: row.resolved_by,
    resolved_at: row.resolved_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    raised_by_user: {
      id: row.raised_by,
      name: row.raised_by_name,
      email: row.raised_by_email,
    },
    resolved_by_user: row.resolved_by
      ? {
          id: row.resolved_by,
          name: row.resolved_by_name,
        }
      : null,
    order: {
      id: row.request_id,
      buyer_id: row.buyer_id,
      seller_id: row.seller_id,
      waste_type: row.waste_type,
      quantity: parseFloat(row.order_quantity || 0),
      amount: parseFloat(row.order_amount || 0),
      status: row.order_status,
      listing_title: row.listing_title,
      buyer_name: row.buyer_name,
      buyer_email: row.buyer_email,
      seller_name: row.seller_name,
      seller_email: row.seller_email,
    },
    activity_history: activities,
  };
}

/**
 * Updates dispute status and records admin resolution.
 * Strictly admin-only.
 */
async function updateDisputeStatus(id, adminId, { status, admin_resolution, admin_notes }) {
  if (!VALID_DISPUTE_STATUSES.includes(status)) {
    const err = new Error(`Invalid dispute status. Must be one of: ${VALID_DISPUTE_STATUSES.join(', ')}`);
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const dispute = await getDisputeById(id, adminId, 'admin');

  // Resolution or rejection requires mandatory resolution notes
  if (['resolved', 'rejected'].includes(status) && (!admin_resolution || !admin_resolution.trim())) {
    const err = new Error(`Mandatory resolution explanation required when marking dispute as "${status}".`);
    err.code = 'BAD_REQUEST';
    throw err;
  }

  // Prevent transitioning finalized disputes back to open or under_review
  if (['resolved', 'rejected', 'closed'].includes(dispute.status) && ['open', 'under_review'].includes(status)) {
    const err = new Error(`Cannot transition finalized dispute (${dispute.status}) back to "${status}".`);
    err.code = 'BAD_REQUEST';
    throw err;
  }

  // Idempotency
  if (dispute.status === status && !admin_resolution && !admin_notes) {
    return dispute;
  }

  const isResolving = ['resolved', 'rejected', 'closed'].includes(status);
  const resolvedAt = isResolving ? new Date() : null;
  const resolvedBy = isResolving ? adminId : null;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Update dispute row
    await connection.execute(
      `UPDATE order_disputes 
       SET status = ?, 
           admin_resolution = COALESCE(?, admin_resolution), 
           admin_notes = COALESCE(?, admin_notes),
           resolved_by = COALESCE(?, resolved_by),
           resolved_at = CASE WHEN ? IS NOT NULL THEN NOW() ELSE resolved_at END,
           updated_at = NOW()
       WHERE id = ?`,
      [
        status,
        admin_resolution ? admin_resolution.trim() : null,
        admin_notes ? admin_notes.trim() : null,
        resolvedBy,
        resolvedAt,
        id,
      ]
    );

    // 2. Append to dispute audit log
    const actId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO dispute_activity (
        id, dispute_id, actor_id, actor_role, action, previous_status, new_status, notes
      ) VALUES (?, ?, ?, 'admin', 'STATUS_UPDATED', ?, ?, ?)`,
      [
        actId,
        id,
        adminId,
        dispute.status,
        status,
        admin_resolution || admin_notes || `Status changed from ${dispute.status} to ${status}`,
      ]
    );

    await connection.commit();

    // Notify buyer and seller about dispute update or resolution
    const recipients = [dispute.order.buyer_id, dispute.order.seller_id].filter(Boolean);
    notificationService.createBulkNotifications(recipients, {
      type: status === 'under_review'
        ? notificationService.NotificationTypes.DISPUTE_UNDER_REVIEW
        : notificationService.NotificationTypes.DISPUTE_RESOLVED,
      title: `Dispute ${status.toUpperCase().replace('_', ' ')}: Order #${dispute.request_id.slice(0, 8).toUpperCase()}`,
      message: admin_resolution
        ? `Resolution: ${admin_resolution}`
        : `Dispute status updated to ${status}.`,
      relatedRequestId: dispute.request_id,
      relatedDisputeId: id,
      relatedEntityType: 'dispute',
      relatedEntityId: id,
      link: '/orders',
      dedupKey: `dispute:${status.toUpperCase()}:${id}`,
    });
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return getDisputeById(id, adminId, 'admin');
}

/**
 * Retrieves dispute audit history.
 */
async function getDisputeHistory(id, userId, userRole) {
  const dispute = await getDisputeById(id, userId, userRole);
  return dispute.activity_history;
}

module.exports = {
  createDispute,
  getDisputes,
  getDisputeById,
  updateDisputeStatus,
  getDisputeHistory,
};
