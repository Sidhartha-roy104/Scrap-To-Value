/**
 * routes/notificationRoutes.js
 * -----------------------------
 * Notification endpoints for Rubbish Revamp.
 * Strictly protected by authMiddleware.
 */

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// Enforce authentication on all notification routes
router.use(authMiddleware);

// GET /api/notifications — List notifications for the authenticated user
router.get('/', notificationController.getNotifications);

// GET /api/notifications/unread-count — Unread notification counter
router.get('/unread-count', notificationController.getUnreadCount);

// GET /api/notifications/preferences — Read user preferences
router.get('/preferences', notificationController.getPreferences);

// PATCH /api/notifications/preferences — Update user preferences
router.patch('/preferences', notificationController.updatePreferences);

// PATCH /api/notifications/read-all — Mark all as read
router.patch('/read-all', notificationController.markAllAsRead);

// PATCH /api/notifications/:id/read — Mark single notification as read
router.patch('/:id/read', notificationController.markAsRead);

// DELETE /api/notifications/:id — Delete single notification
router.delete('/:id', notificationController.deleteNotification);

// DELETE /api/notifications — Clear all notifications
router.delete('/', notificationController.clearAllNotifications);

module.exports = router;
