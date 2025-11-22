/**
 * Notifications Routes
 * FeedHope Server - Notification Endpoints
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { query } = require('../db');

/**
 * Get user notifications
 * GET /api/notifications
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { unreadOnly = false } = req.query;

    let sql = 'SELECT * FROM notifications WHERE user_id = ? AND user_role = ?';
    const params = [userId, role];

    if (unreadOnly === 'true' || unreadOnly === true) {
      sql += ' AND is_read = FALSE';
    }

    sql += ' ORDER BY created_at DESC LIMIT 50';

    const notifications = await query(sql, params);

    // Update unread count
    const [unreadCount] = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND user_role = ? AND is_read = FALSE',
      [userId, role]
    );

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount: unreadCount.count || 0
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications'
    });
  }
});

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;
    const role = req.user.role;

    // Verify ownership
    const notifications = await query(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ? AND user_role = ?',
      [notificationId, userId, role]
    );

    if (notifications.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Update notification
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ?',
      [notificationId]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND user_role = ? AND is_read = FALSE',
      [userId, role]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

module.exports = router;

