// Notification Trigger Service
// Handles sending push notifications for various events

const { Pool } = require('pg');
const pool = new Pool();
const { sendPushNotification, sendMulticastNotification } = require('./firebase');
const { getNotification } = require('./notificationMessages');

/**
 * Get active FCM tokens for a user
 */
const getUserFcmTokens = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT fcm_token FROM user_fcm_tokens WHERE user_id = $1 AND is_active = true',
      [userId]
    );
    return result.rows.map(row => row.fcm_token);
  } catch (error) {
    console.error('Error fetching user FCM tokens:', error);
    return [];
  }
};

/**
 * Save notification to history
 */
const saveNotificationToHistory = async (userId, title, body, type, data = {}) => {
  try {
    await pool.query(
      `INSERT INTO notification_history (user_id, title, body, data, status, sent_at, created_at)
       VALUES ($1, $2, $3, $4, 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userId, title, body, JSON.stringify({ type, ...data })]
    );
  } catch (error) {
    console.error('Error saving notification to history:', error);
  }
};

/**
 * Send notification to a user
 */
const sendUserNotification = async (userId, notificationType, variables = {}, additionalData = {}) => {
  try {
    console.log(`\n🔔 [NOTIFICATION TRIGGER] Starting for user ${userId}, type: ${notificationType}`);
    
    const notification = getNotification(notificationType, variables);
    if (!notification) {
      console.error(`Invalid notification type: ${notificationType}`);
      return { success: false, error: 'Invalid notification type' };
    }

    console.log(`📝 Notification template loaded: title="${notification.title}"`);

    const tokens = await getUserFcmTokens(userId);
    console.log(`🔑 Found ${tokens.length} active FCM token(s) for user ${userId}`);
    
    if (tokens.length === 0) {
      console.log(`⚠️  No active FCM tokens for user ${userId}`);
      // Still save to history for in-app display
      await saveNotificationToHistory(userId, notification.title, notification.body, notification.type, additionalData);
      console.log(`💾 Notification saved to history (no devices to send to)`);
      return { success: true, message: 'Notification saved (no active devices)' };
    }

    const notificationPayload = {
      title: notification.title,
      body: notification.body
    };

    // Send actual notification type in data payload, not the styling type
    const dataPayload = {
      notificationType: notificationType,    // BUNDLE_PURCHASED, TOPIC_ENROLLED, etc.
      notificationStyle: notification.type,   // success, error, warning, info (for styling)
      icon: notification.icon,
      ...additionalData
    };

    console.log(`📤 Payload: title="${notificationPayload.title}", body="${notificationPayload.body}"`);
    console.log(`📊 Data payload:`, dataPayload);

    // Send to all user's devices
    if (tokens.length === 1) {
      console.log(`📱 Sending to single device: ${tokens[0].substring(0, 30)}...`);
      await sendPushNotification(tokens[0], notificationPayload, dataPayload);
    } else {
      console.log(`📱 Sending to ${tokens.length} devices via multicast`);
      await sendMulticastNotification(tokens, notificationPayload, dataPayload);
    }

    // Save to history
    await saveNotificationToHistory(userId, notification.title, notification.body, notification.type, additionalData);
    console.log(`✅ Notification saved to history`);

    console.log(`✅ [SUCCESS] Notification sent to user ${userId}: ${notificationType}\n`);
    return { success: true, message: 'Notification sent successfully' };
  } catch (error) {
    console.error(`❌ [ERROR] Error sending notification to user ${userId}:`, error);
    return { success: false, error: error.message };
  }
};

// ==================== Specific Notification Triggers ====================

/**
 * Send welcome notification on login
 */
const sendWelcomeNotification = async (userId, isFirstLogin = false) => {
  const type = isFirstLogin ? 'FIRST_LOGIN' : 'WELCOME';
  return sendUserNotification(userId, type);
};

/**
 * Send topic enrollment notification
 */
const sendEnrollmentNotification = async (userId, topicTitle) => {
  return sendUserNotification(userId, 'TOPIC_ENROLLED', { topicTitle });
};

/**
 * Send bundle purchase notification
 */
const sendBundlePurchaseNotification = async (userId, categoryName) => {
  return sendUserNotification(userId, 'BUNDLE_PURCHASED', { categoryName });
};

/**
 * Send payment success notification
 */
const sendPaymentSuccessNotification = async (userId, amount) => {
  return sendUserNotification(userId, 'PAYMENT_SUCCESS', { amount });
};

/**
 * Send payment failed notification
 */
const sendPaymentFailedNotification = async (userId) => {
  return sendUserNotification(userId, 'PAYMENT_FAILED');
};

/**
 * Send account closure notification
 */
const sendAccountClosureNotification = async (userId) => {
  return sendUserNotification(userId, 'ACCOUNT_CLOSURE');
};

/**
 * Send new topic available notification (for bundle subscribers)
 */
const sendNewTopicNotification = async (userId, topicTitle, categoryName) => {
  return sendUserNotification(userId, 'NEW_TOPIC_AVAILABLE', { topicTitle, categoryName });
};

/**
 * Send course completion notification
 */
const sendCourseCompletionNotification = async (userId, topicTitle) => {
  return sendUserNotification(userId, 'COURSE_COMPLETED', { topicTitle });
};

/**
 * Send progress milestone notification
 */
const sendProgressMilestoneNotification = async (userId, topicTitle, percentage) => {
  return sendUserNotification(userId, 'PROGRESS_MILESTONE', { topicTitle, percentage });
};

/**
 * Notify all bundle subscribers about new topic
 */
const notifyBundleSubscribersAboutNewTopic = async (categoryId, topicTitle, categoryName) => {
  try {
    // Get all users who have bundle access to this category
    const result = await pool.query(
      `SELECT DISTINCT user_id FROM user_category_bundles 
       WHERE category_id = $1 AND include_future_topics = true`,
      [categoryId]
    );

    const userIds = result.rows.map(row => row.user_id);
    console.log(`Notifying ${userIds.length} bundle subscribers about new topic`);

    for (const userId of userIds) {
      await sendNewTopicNotification(userId, topicTitle, categoryName);
    }

    return { success: true, notifiedUsers: userIds.length };
  } catch (error) {
    console.error('Error notifying bundle subscribers:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendUserNotification,
  sendWelcomeNotification,
  sendEnrollmentNotification,
  sendBundlePurchaseNotification,
  sendPaymentSuccessNotification,
  sendPaymentFailedNotification,
  sendAccountClosureNotification,
  sendNewTopicNotification,
  sendCourseCompletionNotification,
  sendProgressMilestoneNotification,
  notifyBundleSubscribersAboutNewTopic,
  getUserFcmTokens,
  saveNotificationToHistory
};
