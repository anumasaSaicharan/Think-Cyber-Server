const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const pool = new Pool();
const {
  registerFcmToken,
  removeFcmToken,
  deactivateFcmToken,
  getUserDevices,
  sendNotificationToUser,
  sendNotificationToUsers,
  sendBroadcastNotification,
  getNotificationHistory,
  subscribeToTopic,
  unsubscribeFromTopic,
} = require('../controllers/notificationController');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'thinkCyberAdminKey2024';

// Middleware to verify JWT token or Admin API key
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-admin-api-key'];
  
  // First check for Admin API key
  if (apiKey && apiKey === ADMIN_API_KEY) {
    req.user = { id: 'admin', isAdmin: true };
    return next();
  }
  
  // Otherwise check for Bearer token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

/**
 * @swagger
 * tags:
 *   - name: Notifications
 *     description: Firebase Cloud Messaging (FCM) Push Notifications
 */

/**
 * @swagger
 * /api/notifications/register-token:
 *   post:
 *     tags: [Notifications]
 *     summary: Register FCM token for push notifications
 *     description: Register or update the FCM token for the authenticated user's device
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcmToken
 *             properties:
 *               fcmToken:
 *                 type: string
 *                 description: Firebase Cloud Messaging token
 *                 example: 'fMZvQVn5RJa...'
 *               deviceId:
 *                 type: string
 *                 description: Unique device identifier
 *                 example: 'abc123-device-id'
 *               deviceType:
 *                 type: string
 *                 enum: [android, ios, web]
 *                 description: Type of device
 *                 example: 'android'
 *               deviceName:
 *                 type: string
 *                 description: Human-readable device name
 *                 example: 'Samsung Galaxy S21'
 *     responses:
 *       200:
 *         description: Token registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: FCM token is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/register-token', verifyToken, async (req, res) => {
  const { fcmToken, deviceId, deviceType, deviceName } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ success: false, error: 'FCM token is required' });
  }

  try {
    const result = await registerFcmToken(req.user.userId, fcmToken, {
      deviceId,
      deviceType,
      deviceName,
    });

    res.json({
      success: true,
      message: 'FCM token registered successfully',
      data: result.data,
    });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    res.status(500).json({ success: false, error: 'Failed to register FCM token' });
  }
});

/**
 * @swagger
 * /api/notifications/remove-token:
 *   post:
 *     tags: [Notifications]
 *     summary: Remove FCM token (on logout)
 *     description: Remove the FCM token when user logs out
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcmToken
 *             properties:
 *               fcmToken:
 *                 type: string
 *                 description: Firebase Cloud Messaging token to remove
 *     responses:
 *       200:
 *         description: Token removed successfully
 *       400:
 *         description: FCM token is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/remove-token', verifyToken, async (req, res) => {
  const { fcmToken } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ success: false, error: 'FCM token is required' });
  }

  try {
    const result = await removeFcmToken(fcmToken);
    res.json({
      success: true,
      message: 'FCM token removed successfully',
      deleted: result.deleted,
    });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({ success: false, error: 'Failed to remove FCM token' });
  }
});

/**
 * @swagger
 * /api/notifications/devices:
 *   get:
 *     tags: [Notifications]
 *     summary: Get user's registered devices
 *     description: Get all devices registered for push notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 devices:
 *                   type: array
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/devices', verifyToken, async (req, res) => {
  try {
    const result = await getUserDevices(req.user.userId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching user devices:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch devices' });
  }
});

/**
 * @swagger
 * /api/notifications/deactivate-device:
 *   post:
 *     tags: [Notifications]
 *     summary: Deactivate a device (soft delete)
 *     description: Deactivate push notifications for a specific device
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcmToken
 *             properties:
 *               fcmToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device deactivated
 *       400:
 *         description: FCM token is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/deactivate-device', verifyToken, async (req, res) => {
  const { fcmToken } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ success: false, error: 'FCM token is required' });
  }

  try {
    const result = await deactivateFcmToken(fcmToken);
    res.json({
      success: true,
      message: 'Device deactivated successfully',
      deactivated: result.deactivated,
    });
  } catch (error) {
    console.error('Error deactivating device:', error);
    res.status(500).json({ success: false, error: 'Failed to deactivate device' });
  }
});

/**
 * @swagger
 * /api/notifications/history:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notification history
 *     description: Get push notification history for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Notification history
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/history', verifyToken, async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const result = await getNotificationHistory(req.user.userId, limit, offset);
    res.json(result);
  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notification history' });
  }
});

/**
 * @swagger
 * /api/notifications/subscribe-topic:
 *   post:
 *     tags: [Notifications]
 *     summary: Subscribe to a notification topic
 *     description: Subscribe user's device to a specific topic for group notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcmToken
 *               - topic
 *             properties:
 *               fcmToken:
 *                 type: string
 *               topic:
 *                 type: string
 *                 example: 'new-courses'
 *     responses:
 *       200:
 *         description: Subscribed to topic
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/subscribe-topic', verifyToken, async (req, res) => {
  const { fcmToken, topic } = req.body;

  if (!fcmToken || !topic) {
    return res.status(400).json({ success: false, error: 'FCM token and topic are required' });
  }

  try {
    const result = await subscribeToTopic([fcmToken], topic);
    res.json({
      success: true,
      message: `Subscribed to topic: ${topic}`,
      ...result,
    });
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    res.status(500).json({ success: false, error: 'Failed to subscribe to topic' });
  }
});

/**
 * @swagger
 * /api/notifications/unsubscribe-topic:
 *   post:
 *     tags: [Notifications]
 *     summary: Unsubscribe from a notification topic
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcmToken
 *               - topic
 *             properties:
 *               fcmToken:
 *                 type: string
 *               topic:
 *                 type: string
 *     responses:
 *       200:
 *         description: Unsubscribed from topic
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/unsubscribe-topic', verifyToken, async (req, res) => {
  const { fcmToken, topic } = req.body;

  if (!fcmToken || !topic) {
    return res.status(400).json({ success: false, error: 'FCM token and topic are required' });
  }

  try {
    const result = await unsubscribeFromTopic([fcmToken], topic);
    res.json({
      success: true,
      message: `Unsubscribed from topic: ${topic}`,
      ...result,
    });
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    res.status(500).json({ success: false, error: 'Failed to unsubscribe from topic' });
  }
});

// ============== ADMIN ENDPOINTS ==============

/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     tags: [Notifications]
 *     summary: Send notification to specific user (Admin)
 *     description: Send push notification to a specific user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - title
 *               - body
 *             properties:
 *               userId:
 *                 type: integer
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Notification sent
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/send', verifyToken, async (req, res) => {
  // TODO: Add admin role check
  const { userId, title, body, imageUrl, data } = req.body;

  if (!userId || !title || !body) {
    return res.status(400).json({ success: false, error: 'userId, title, and body are required' });
  }

  try {
    const result = await sendNotificationToUser(
      userId,
      { title, body, imageUrl },
      data || {}
    );
    res.json(result);
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
});

/**
 * @swagger
 * /api/notifications/send-multiple:
 *   post:
 *     tags: [Notifications]
 *     summary: Send notification to multiple users (Admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *               - title
 *               - body
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Notifications sent
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/send-multiple', verifyToken, async (req, res) => {
  // TODO: Add admin role check
  const { userIds, title, body, imageUrl, data } = req.body;

  if (!userIds || !Array.isArray(userIds) || !title || !body) {
    return res.status(400).json({ success: false, error: 'userIds (array), title, and body are required' });
  }

  try {
    const result = await sendNotificationToUsers(
      userIds,
      { title, body, imageUrl },
      data || {}
    );
    res.json(result);
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to send notifications' });
  }
});

/**
 * @swagger
 * /api/notifications/broadcast:
 *   post:
 *     tags: [Notifications]
 *     summary: Send notification to all users (Admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *             properties:
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Broadcast sent
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/broadcast', verifyToken, async (req, res) => {
  // TODO: Add admin role check
  const { title, body, imageUrl, data } = req.body;

  if (!title || !body) {
    return res.status(400).json({ success: false, error: 'title and body are required' });
  }

  try {
    const result = await sendBroadcastNotification(
      { title, body, imageUrl },
      data || {}
    );

    // Log the broadcast to database
    await pool.query(
      `INSERT INTO notification_history (user_id, title, body, data, status, sent_at)
       VALUES (NULL, $1, $2, $3, 'broadcast', CURRENT_TIMESTAMP)`,
      [title, body, JSON.stringify({ ...(data || {}), imageUrl, type: 'broadcast' })]
    );

    res.json(result);
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ success: false, error: 'Failed to send broadcast' });
  }
});

/**
 * @swagger
 * /api/notifications/broadcast-history:
 *   get:
 *     tags: [Notifications]
 *     summary: Get broadcast notification history (Admin)
 *     description: Get all broadcast notifications sent by admins
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Broadcast history
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/broadcast-history', verifyToken, async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const result = await pool.query(
      `SELECT * FROM notification_history 
       WHERE status = 'broadcast' OR user_id IS NULL
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM notification_history WHERE status = 'broadcast' OR user_id IS NULL"
    );

    res.json({
      success: true,
      notifications: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching broadcast history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch broadcast history' });
  }
});

/**
 * @swagger
 * /api/notifications/stats:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notification statistics (Admin)
 *     description: Get stats about registered devices and sent notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification statistics
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const [devicesResult, activeDevicesResult, broadcastsResult, usersWithDevicesResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM user_fcm_tokens'),
      pool.query('SELECT COUNT(*) as total FROM user_fcm_tokens WHERE is_active = true'),
      pool.query("SELECT COUNT(*) as total FROM notification_history WHERE status = 'broadcast'"),
      pool.query('SELECT COUNT(DISTINCT user_id) as total FROM user_fcm_tokens WHERE is_active = true')
    ]);

    res.json({
      success: true,
      stats: {
        totalDevices: parseInt(devicesResult.rows[0].total),
        activeDevices: parseInt(activeDevicesResult.rows[0].total),
        totalBroadcasts: parseInt(broadcastsResult.rows[0].total),
        usersWithDevices: parseInt(usersWithDevicesResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

/**
 * @swagger
 * /api/notifications/history/{userId}:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notification history for a specific user
 *     description: Retrieves all notifications sent to a user including broadcasts
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of notifications to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of notifications to skip
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Return only unread notifications
 *     responses:
 *       200:
 *         description: User notification history
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';
    const filterType = req.query.filterType; // 'broadcast', 'personal', or null for all

    // Get notifications for this user (personal + broadcasts)
    let query = `
      SELECT 
        id,
        user_id,
        title,
        body as message,
        COALESCE(data->>'type', 'info') as type,
        COALESCE((data->>'isRead')::boolean, false) as "isRead",
        created_at as "createdAt",
        CASE 
          WHEN status = 'broadcast' THEN 'campaign'
          WHEN COALESCE(data->>'type', '') = 'success' THEN 'check_circle'
          WHEN COALESCE(data->>'type', '') = 'error' THEN 'error'
          WHEN COALESCE(data->>'type', '') = 'warning' THEN 'warning'
          ELSE 'notifications'
        END as icon,
        status,
        CASE 
          WHEN user_id IS NULL THEN 'broadcast'
          ELSE 'personal'
        END as "notificationType",
        data
      FROM notification_history
      WHERE (user_id = $1 OR user_id IS NULL)
    `;
    
    const params = [userId];
    let paramIndex = 2;
    
    // Filter by notification type if specified
    if (filterType === 'broadcast') {
      query += ` AND user_id IS NULL`;
    } else if (filterType === 'personal') {
      query += ` AND user_id = $1`;
    }
    
    if (unreadOnly) {
      query += ` AND COALESCE((data->>'isRead')::boolean, false) = false`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM notification_history 
      WHERE (user_id = $1 OR user_id IS NULL)
    `;
    if (filterType === 'broadcast') {
      countQuery += ` AND user_id IS NULL`;
    } else if (filterType === 'personal') {
      countQuery += ` AND user_id = $1`;
    }
    if (unreadOnly) {
      countQuery += ` AND COALESCE((data->>'isRead')::boolean, false) = false`;
    }
    const countResult = await pool.query(countQuery, [userId]);

    // Get unread count
    const unreadResult = await pool.query(`
      SELECT COUNT(*) as unread 
      FROM notification_history 
      WHERE (user_id = $1 OR user_id IS NULL) 
      AND COALESCE((data->>'isRead')::boolean, false) = false
    `, [userId]);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      unreadCount: parseInt(unreadResult.rows[0].unread),
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching user notification history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notification history' });
  }
});

/**
 * @swagger
 * /api/notifications/mark-read/{notificationId}:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.put('/mark-read/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;

    await pool.query(`
      UPDATE notification_history 
      SET data = COALESCE(data, '{}'::jsonb) || '{"isRead": true}'::jsonb
      WHERE id = $1
    `, [notificationId]);

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

/**
 * @swagger
 * /api/notifications/mark-all-read/{userId}:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read for a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.put('/mark-all-read/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(`
      UPDATE notification_history 
      SET data = COALESCE(data, '{}'::jsonb) || '{"isRead": true}'::jsonb
      WHERE (user_id = $1 OR user_id IS NULL)
      AND COALESCE((data->>'isRead')::boolean, false) = false
    `, [userId]);

    res.json({ 
      success: true, 
      message: 'All notifications marked as read',
      updatedCount: result.rowCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notifications as read' });
  }
});

module.exports = router;
