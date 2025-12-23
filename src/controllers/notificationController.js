const { Pool } = require('pg');
const pool = new Pool();
const {
  sendPushNotification,
  sendMulticastNotification,
  sendTopicNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
} = require('../config/firebase');

/**
 * Register or update FCM token for a user
 */
async function registerFcmToken(userId, fcmToken, deviceInfo = {}) {
  const { deviceId, deviceType, deviceName } = deviceInfo;

  try {
    // Use upsert to handle duplicate tokens
    const result = await pool.query(
      `INSERT INTO user_fcm_tokens (user_id, fcm_token, device_id, device_type, device_name, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, fcm_token)
       DO UPDATE SET 
         device_id = EXCLUDED.device_id,
         device_type = EXCLUDED.device_type,
         device_name = EXCLUDED.device_name,
         is_active = true,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, fcmToken, deviceId || null, deviceType || null, deviceName || null]
    );

    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error('Error registering FCM token:', error);
    throw error;
  }
}

/**
 * Remove FCM token (on logout or token refresh)
 */
async function removeFcmToken(fcmToken) {
  try {
    const result = await pool.query(
      'DELETE FROM user_fcm_tokens WHERE fcm_token = $1 RETURNING *',
      [fcmToken]
    );

    return { success: true, deleted: result.rowCount > 0 };
  } catch (error) {
    console.error('Error removing FCM token:', error);
    throw error;
  }
}

/**
 * Deactivate FCM token (soft delete)
 */
async function deactivateFcmToken(fcmToken) {
  try {
    const result = await pool.query(
      'UPDATE user_fcm_tokens SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE fcm_token = $1 RETURNING *',
      [fcmToken]
    );

    return { success: true, deactivated: result.rowCount > 0 };
  } catch (error) {
    console.error('Error deactivating FCM token:', error);
    throw error;
  }
}

/**
 * Get all active FCM tokens for a user
 */
async function getUserFcmTokens(userId) {
  try {
    const result = await pool.query(
      'SELECT * FROM user_fcm_tokens WHERE user_id = $1 AND is_active = true ORDER BY updated_at DESC',
      [userId]
    );

    return { success: true, tokens: result.rows };
  } catch (error) {
    console.error('Error fetching user FCM tokens:', error);
    throw error;
  }
}

/**
 * Get all user devices (tokens) for a user
 */
async function getUserDevices(userId) {
  try {
    const result = await pool.query(
      `SELECT id, device_id, device_type, device_name, is_active, created_at, updated_at 
       FROM user_fcm_tokens 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
      [userId]
    );

    return { success: true, devices: result.rows };
  } catch (error) {
    console.error('Error fetching user devices:', error);
    throw error;
  }
}

/**
 * Send notification to a specific user (all their devices)
 */
async function sendNotificationToUser(userId, notification, data = {}) {
  try {
    const tokensResult = await getUserFcmTokens(userId);
    const tokens = tokensResult.tokens.map(t => t.fcm_token);

    if (tokens.length === 0) {
      return { success: false, error: 'No active devices found for user' };
    }

    // Log notification to history
    await pool.query(
      `INSERT INTO notification_history (user_id, title, body, data, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [userId, notification.title, notification.body, JSON.stringify(data)]
    );

    if (tokens.length === 1) {
      const result = await sendPushNotification(tokens[0], notification, data);
      
      // Update notification status
      await pool.query(
        `UPDATE notification_history 
         SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1 AND status = 'pending' 
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      return result;
    } else {
      const result = await sendMulticastNotification(tokens, notification, data);
      
      // Handle failed tokens (remove invalid ones)
      if (result.failureCount > 0) {
        await handleFailedTokens(tokens, result.responses);
      }

      // Update notification status
      await pool.query(
        `UPDATE notification_history 
         SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1 AND status = 'pending' 
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      return result;
    }
  } catch (error) {
    console.error('Error sending notification to user:', error);

    // Log error to notification history
    await pool.query(
      `UPDATE notification_history 
       SET status = 'failed', error_message = $2 
       WHERE user_id = $1 AND status = 'pending' 
       ORDER BY created_at DESC LIMIT 1`,
      [userId, error.message]
    );

    throw error;
  }
}

/**
 * Send notification to multiple users
 */
async function sendNotificationToUsers(userIds, notification, data = {}) {
  const results = [];

  for (const userId of userIds) {
    try {
      const result = await sendNotificationToUser(userId, notification, data);
      results.push({ userId, ...result });
    } catch (error) {
      results.push({ userId, success: false, error: error.message });
    }
  }

  return {
    success: true,
    results,
    successCount: results.filter(r => r.success).length,
    failureCount: results.filter(r => !r.success).length,
  };
}

/**
 * Send notification to all users (broadcast)
 */
async function sendBroadcastNotification(notification, data = {}) {
  try {
    // Get all active tokens
    const result = await pool.query(
      'SELECT DISTINCT fcm_token FROM user_fcm_tokens WHERE is_active = true'
    );

    const tokens = result.rows.map(r => r.fcm_token);

    if (tokens.length === 0) {
      return { success: false, error: 'No active devices found' };
    }

    // FCM allows max 500 tokens per multicast
    const batchSize = 500;
    const batches = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      batches.push(tokens.slice(i, i + batchSize));
    }

    let totalSuccess = 0;
    let totalFailure = 0;

    for (const batch of batches) {
      const batchResult = await sendMulticastNotification(batch, notification, data);
      totalSuccess += batchResult.successCount;
      totalFailure += batchResult.failureCount;

      // Handle failed tokens
      if (batchResult.failureCount > 0) {
        await handleFailedTokens(batch, batchResult.responses);
      }
    }

    return {
      success: true,
      totalDevices: tokens.length,
      successCount: totalSuccess,
      failureCount: totalFailure,
    };
  } catch (error) {
    console.error('Error sending broadcast notification:', error);
    throw error;
  }
}

/**
 * Handle failed tokens (deactivate invalid ones)
 */
async function handleFailedTokens(tokens, responses) {
  const invalidTokens = [];

  responses.forEach((response, index) => {
    if (!response.success) {
      const error = response.error;
      // These error codes indicate the token is invalid and should be removed
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        invalidTokens.push(tokens[index]);
      }
    }
  });

  if (invalidTokens.length > 0) {
    await pool.query(
      'UPDATE user_fcm_tokens SET is_active = false WHERE fcm_token = ANY($1)',
      [invalidTokens]
    );
    console.log(`Deactivated ${invalidTokens.length} invalid FCM tokens`);
  }
}

/**
 * Get notification history for a user
 */
async function getNotificationHistory(userId, limit = 50, offset = 0) {
  try {
    const result = await pool.query(
      `SELECT * FROM notification_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM notification_history WHERE user_id = $1',
      [userId]
    );

    return {
      success: true,
      notifications: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    };
  } catch (error) {
    console.error('Error fetching notification history:', error);
    throw error;
  }
}

module.exports = {
  registerFcmToken,
  removeFcmToken,
  deactivateFcmToken,
  getUserFcmTokens,
  getUserDevices,
  sendNotificationToUser,
  sendNotificationToUsers,
  sendBroadcastNotification,
  getNotificationHistory,
  subscribeToTopic,
  unsubscribeFromTopic,
  sendTopicNotification,
};
