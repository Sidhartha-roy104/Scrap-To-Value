/**
 * controllers/notificationController.js
 * -------------------------------------
 * Express controller for notification APIs.
 */

const notificationService = require('../services/notificationService');

function errorToStatus(code) {
  switch (code) {
    case 'NOT_FOUND':
      return 404;
    case 'FORBIDDEN':
      return 403;
    case 'BAD_REQUEST':
      return 400;
    default:
      return 500;
  }
}

/**
 * GET /api/notifications
 */
async function getNotifications(req, res, next) {
  try {
    const { unreadOnly, type, page, limit } = req.query;
    const data = await notificationService.getNotifications({
      userId: req.user.id,
      unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
      type: type || null,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notifications/unread-count
 */
async function getUnreadCount(req, res, next) {
  try {
    const data = await notificationService.getUnreadCount(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/:id/read
 */
async function markAsRead(req, res, next) {
  try {
    const data = await notificationService.markAsRead(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    const status = errorToStatus(err.code);
    if (status < 500) {
      return res.status(status).json({ success: false, message: err.message });
    }
    next(err);
  }
}

/**
 * PATCH /api/notifications/read-all
 */
async function markAllAsRead(req, res, next) {
  try {
    const data = await notificationService.markAllAsRead(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/notifications/:id
 */
async function deleteNotification(req, res, next) {
  try {
    const data = await notificationService.deleteNotification(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
      data,
    });
  } catch (err) {
    const status = errorToStatus(err.code);
    if (status < 500) {
      return res.status(status).json({ success: false, message: err.message });
    }
    next(err);
  }
}

/**
 * DELETE /api/notifications
 */
async function clearAllNotifications(req, res, next) {
  try {
    const data = await notificationService.clearAllNotifications(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'All notifications cleared successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notifications/preferences
 */
async function getPreferences(req, res, next) {
  try {
    const data = await notificationService.getUserPreferences(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/preferences
 */
async function updatePreferences(req, res, next) {
  try {
    const data = await notificationService.updateUserPreferences(req.user.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getPreferences,
  updatePreferences,
};
