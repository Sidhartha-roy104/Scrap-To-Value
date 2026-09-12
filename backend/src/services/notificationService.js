/**
 * services/notificationService.js
 * --------------------------------
 * Core Notification Service for Rubbish Revamp B2B Marketplace.
 *
 * Provides:
 * - Deterministic event deduplication (prevents duplicate alerts)
 * - User notification preference checking (non-critical opt-outs)
 * - Safe non-blocking execution (guaranteed never to crash parent transactions)
 * - Role-isolated notification reading & management
 * - Multi-recipient and Admin operational alert dispatching
 */

const crypto = require('crypto');
const { pool } = require('../config/db');
const emailService = require('./emailService');

// ---------------------------------------------------------------------------
// Centralized Notification Event Types
// ---------------------------------------------------------------------------
const NotificationTypes = {
  // Order Lifecycle
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_ACCEPTED: 'ORDER_ACCEPTED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',

  // Payment Lifecycle
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_SUCCEEDED: 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',

  // Fulfillment Lifecycle
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  ORDER_IN_TRANSIT: 'ORDER_IN_TRANSIT',
  ORDER_DELIVERED: 'ORDER_DELIVERED',

  // Dispute Lifecycle
  DISPUTE_RAISED: 'DISPUTE_RAISED',
  DISPUTE_UNDER_REVIEW: 'DISPUTE_UNDER_REVIEW',
  DISPUTE_RESOLVED: 'DISPUTE_RESOLVED',
  DISPUTE_REJECTED: 'DISPUTE_REJECTED',
  DISPUTE_CLOSED: 'DISPUTE_CLOSED',

  // Operational & Moderation
  SELLER_VERIFICATION_UPDATED: 'SELLER_VERIFICATION_UPDATED',
  LISTING_FLAGGED: 'LISTING_FLAGGED',
  ADMIN_ALERT: 'ADMIN_ALERT',
  SYSTEM_ALERT: 'SYSTEM_ALERT',
  REVIEW_RECEIVED: 'REVIEW_RECEIVED',
};

/**
 * Maps notification types to preference categories.
 * Critical alerts return null and cannot be disabled.
 */
function getPreferenceCategory(type) {
  switch (type) {
    case NotificationTypes.ORDER_CREATED:
    case NotificationTypes.ORDER_ACCEPTED:
    case NotificationTypes.ORDER_CANCELLED:
    case NotificationTypes.ORDER_CONFIRMED:
      return 'orders_enabled';

    case NotificationTypes.PAYMENT_REQUIRED:
    case NotificationTypes.PAYMENT_SUCCEEDED:
    case NotificationTypes.PAYMENT_FAILED:
      return 'payments_enabled';

    case NotificationTypes.READY_FOR_PICKUP:
    case NotificationTypes.ORDER_IN_TRANSIT:
    case NotificationTypes.ORDER_DELIVERED:
      return 'fulfillment_enabled';

    case NotificationTypes.LISTING_FLAGGED:
      return 'listings_enabled';

    // Critical types: disputes, verification, security, and admin alerts always deliver
    case NotificationTypes.DISPUTE_RAISED:
    case NotificationTypes.DISPUTE_UNDER_REVIEW:
    case NotificationTypes.DISPUTE_RESOLVED:
    case NotificationTypes.DISPUTE_REJECTED:
    case NotificationTypes.DISPUTE_CLOSED:
    case NotificationTypes.SELLER_VERIFICATION_UPDATED:
    case NotificationTypes.ADMIN_ALERT:
    case NotificationTypes.SYSTEM_ALERT:
    default:
      return null;
  }
}

/**
 * Retrieves or creates default notification preferences for a user.
 */
async function getUserPreferences(userId) {
  const [rows] = await pool.execute(
    'SELECT * FROM notification_preferences WHERE user_id = ? LIMIT 1',
    [userId]
  );

  if (rows.length > 0) {
    return {
      orders_enabled: Boolean(rows[0].orders_enabled),
      payments_enabled: Boolean(rows[0].payments_enabled),
      fulfillment_enabled: Boolean(rows[0].fulfillment_enabled),
      disputes_enabled: Boolean(rows[0].disputes_enabled),
      listings_enabled: Boolean(rows[0].listings_enabled),
    };
  }

  // Insert default row
  await pool.execute(
    `INSERT IGNORE INTO notification_preferences (user_id, orders_enabled, payments_enabled, fulfillment_enabled, disputes_enabled, listings_enabled)
     VALUES (?, 1, 1, 1, 1, 1)`,
    [userId]
  );

  return {
    orders_enabled: true,
    payments_enabled: true,
    fulfillment_enabled: true,
    disputes_enabled: true,
    listings_enabled: true,
  };
}

/**
 * Updates notification preferences for a user.
 */
async function updateUserPreferences(userId, prefs = {}) {
  const current = await getUserPreferences(userId);
  const updated = {
    orders_enabled: prefs.orders_enabled !== undefined ? (prefs.orders_enabled ? 1 : 0) : current.orders_enabled ? 1 : 0,
    payments_enabled: prefs.payments_enabled !== undefined ? (prefs.payments_enabled ? 1 : 0) : current.payments_enabled ? 1 : 0,
    fulfillment_enabled: prefs.fulfillment_enabled !== undefined ? (prefs.fulfillment_enabled ? 1 : 0) : current.fulfillment_enabled ? 1 : 0,
    disputes_enabled: prefs.disputes_enabled !== undefined ? (prefs.disputes_enabled ? 1 : 0) : current.disputes_enabled ? 1 : 0,
    listings_enabled: prefs.listings_enabled !== undefined ? (prefs.listings_enabled ? 1 : 0) : current.listings_enabled ? 1 : 0,
  };

  await pool.execute(
    `INSERT INTO notification_preferences (user_id, orders_enabled, payments_enabled, fulfillment_enabled, disputes_enabled, listings_enabled)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       orders_enabled = VALUES(orders_enabled),
       payments_enabled = VALUES(payments_enabled),
       fulfillment_enabled = VALUES(fulfillment_enabled),
       disputes_enabled = VALUES(disputes_enabled),
       listings_enabled = VALUES(listings_enabled)`,
    [
      userId,
      updated.orders_enabled,
      updated.payments_enabled,
      updated.fulfillment_enabled,
      updated.disputes_enabled,
      updated.listings_enabled,
    ]
  );

  return getUserPreferences(userId);
}

/**
 * Creates a notification.
 * 
 * Guarantees:
 * 1. Deduplication: If a notification with dedupKey already exists, returns existing without duplicate insertion.
 * 2. User preference check: Non-critical notifications are skipped if user opted out.
 * 3. Never crashes caller: Wrapped in try-catch; logs errors gracefully.
 */
async function createNotification({
  recipientId,
  type,
  title,
  message,
  relatedRequestId = null,
  relatedDisputeId = null,
  relatedEntityType = null,
  relatedEntityId = null,
  link = null,
  dedupKey = null,
  failSilently = true,
}) {
  try {
    if (!recipientId || !type || !title || !message) {
      console.warn('[NotificationService] Missing required fields for notification creation.');
      return null;
    }

    // 1. Deduplication check
    if (dedupKey) {
      const [existing] = await pool.execute(
        'SELECT id, recipient_id, type, title, message, is_read, created_at FROM notifications WHERE dedup_key = ? LIMIT 1',
        [dedupKey]
      );
      if (existing.length > 0) {
        return existing[0];
      }
    }

    // 2. User preference check (for non-critical notification categories)
    const category = getPreferenceCategory(type);
    if (category) {
      const prefs = await getUserPreferences(recipientId);
      if (prefs[category] === false) {
        // User opted out of this non-critical category
        return null;
      }
    }

    // 3. Insert notification
    const id = crypto.randomUUID();
    const query = `
      INSERT INTO notifications (
        id, recipient_id, type, title, message,
        related_request_id, related_dispute_id, related_entity_type, related_entity_id,
        link, is_read, dedup_key, \`read\`, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, NOW())
    `;

    await pool.execute(query, [
      id,
      recipientId,
      type,
      title,
      message,
      relatedRequestId,
      relatedDisputeId,
      relatedEntityType,
      relatedEntityId,
      link,
      dedupKey || null,
    ]);

    // 4. Non-blocking Simulated Email Notification
    (async () => {
      try {
        const [userRows] = await pool.execute('SELECT email FROM users WHERE id = ? LIMIT 1', [recipientId]);
        if (userRows.length > 0 && userRows[0].email) {
          await emailService.sendEmail({
            to: userRows[0].email,
            subject: title,
            text: `${title}\n\n${message}\n\nView details: ${link || '/dashboard'}`,
            category: type,
          });
        }
      } catch (emailErr) {
        // Non-blocking log
      }
    })();

    return {
      id,
      recipient_id: recipientId,
      type,
      title,
      message,
      related_request_id: relatedRequestId,
      related_dispute_id: relatedDisputeId,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      link,
      is_read: false,
      dedup_key: dedupKey,
      created_at: new Date(),
    };
  } catch (err) {
    console.error('[NotificationService] Error creating notification:', err.message);
    if (!failSilently) throw err;
    return null;
  }
}

/**
 * Creates notifications for multiple recipients.
 */
async function createBulkNotifications(recipientIds, params) {
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) return [];
  const results = [];
  for (const recipientId of recipientIds) {
    const userDedupKey = params.dedupKey ? `${params.dedupKey}:${recipientId}` : null;
    const n = await createNotification({
      ...params,
      recipientId,
      dedupKey: userDedupKey,
    });
    if (n) results.push(n);
  }
  return results;
}

/**
 * Operational Alert: Notifies all active administrators.
 */
async function notifyAdmins({ type = NotificationTypes.ADMIN_ALERT, title, message, link, relatedEntityId, relatedEntityType, dedupKey }) {
  try {
    const [admins] = await pool.execute(
      "SELECT id FROM users WHERE role = 'admin' AND is_active = 1"
    );
    const adminIds = admins.map((a) => a.id);
    return createBulkNotifications(adminIds, {
      type,
      title,
      message,
      link: link || '/admin',
      relatedEntityId,
      relatedEntityType,
      dedupKey,
    });
  } catch (err) {
    console.error('[NotificationService] Error broadcasting admin alert:', err.message);
    return [];
  }
}

/**
 * Retrieves notifications for the logged-in user with pagination and optional unread filter.
 */
async function getNotifications({
  userId,
  unreadOnly = false,
  type = null,
  page = 1,
  limit = 20,
}) {
  const conditions = ['recipient_id = ?'];
  const params = [userId];

  if (unreadOnly) {
    conditions.push('is_read = 0');
  }

  if (type && type !== 'All') {
    conditions.push('type = ?');
    params.push(type);
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM notifications ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const [unreadRows] = await pool.execute(
    'SELECT COUNT(*) as unread FROM notifications WHERE recipient_id = ? AND is_read = 0',
    [userId]
  );
  const unreadCount = unreadRows[0]?.unread || 0;

  const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (numPage - 1) * numLimit;

  const [rows] = await pool.query(
    `SELECT 
       id, recipient_id, type, title, message,
       related_request_id, related_dispute_id, related_entity_type, related_entity_id,
       link, is_read, \`read\`, created_at, read_at
     FROM notifications
     ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, numLimit, offset]
  );

  return {
    notifications: rows.map((r) => ({
      id: r.id,
      recipient_id: r.recipient_id,
      type: r.type,
      title: r.title,
      message: r.message,
      related_request_id: r.related_request_id,
      related_dispute_id: r.related_dispute_id,
      related_entity_type: r.related_entity_type,
      related_entity_id: r.related_entity_id,
      link: r.link,
      is_read: Boolean(r.is_read || r.read),
      read: Boolean(r.is_read || r.read),
      created_at: r.created_at,
      read_at: r.read_at,
    })),
    total,
    unreadCount,
    page: numPage,
    limit: numLimit,
    totalPages: Math.ceil(total / numLimit),
  };
}

/**
 * Retrieves unread notification count for a user.
 */
async function getUnreadCount(userId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = 0',
    [userId]
  );
  return { unreadCount: rows[0]?.count || 0 };
}

/**
 * Marks a single notification as read.
 * Enforces ownership check.
 */
async function markAsRead(notificationId, userId) {
  const [rows] = await pool.execute(
    'SELECT id, recipient_id FROM notifications WHERE id = ? LIMIT 1',
    [notificationId]
  );

  if (rows.length === 0) {
    const err = new Error('Notification not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (rows[0].recipient_id !== userId) {
    const err = new Error('Forbidden: You can only update your own notifications');
    err.code = 'FORBIDDEN';
    throw err;
  }

  await pool.execute(
    'UPDATE notifications SET is_read = 1, `read` = 1, read_at = NOW() WHERE id = ?',
    [notificationId]
  );

  return { id: notificationId, is_read: true, read_at: new Date() };
}

/**
 * Marks all notifications as read for a user.
 */
async function markAllAsRead(userId) {
  const [result] = await pool.execute(
    'UPDATE notifications SET is_read = 1, `read` = 1, read_at = NOW() WHERE recipient_id = ? AND is_read = 0',
    [userId]
  );
  return { updatedCount: result.affectedRows || 0 };
}

/**
 * Deletes a notification with ownership guard.
 */
async function deleteNotification(notificationId, userId) {
  const [rows] = await pool.execute(
    'SELECT id, recipient_id FROM notifications WHERE id = ? LIMIT 1',
    [notificationId]
  );

  if (rows.length === 0) {
    const err = new Error('Notification not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (rows[0].recipient_id !== userId) {
    const err = new Error('Forbidden: You can only delete your own notifications');
    err.code = 'FORBIDDEN';
    throw err;
  }

  await pool.execute('DELETE FROM notifications WHERE id = ?', [notificationId]);
  return { id: notificationId, deleted: true };
}

/**
 * Clears all notifications for a user.
 */
async function clearAllNotifications(userId) {
  const [result] = await pool.execute(
    'DELETE FROM notifications WHERE recipient_id = ?',
    [userId]
  );
  return { deletedCount: result.affectedRows || 0 };
}

module.exports = {
  NotificationTypes,
  getUserPreferences,
  updateUserPreferences,
  createNotification,
  createBulkNotifications,
  notifyAdmins,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
};
