/**
 * Firebase Admin SDK Configuration
 * 
 * Setup Instructions:
 * 1. Go to Firebase Console: https://console.firebase.google.com
 * 2. Select your project (or create one)
 * 3. Go to Project Settings > Service Accounts
 * 4. Click "Generate new private key" and download the JSON file
 * 5. Set the following environment variables in your .env file:
 * 
 * FIREBASE_PROJECT_ID=your-project-id
 * FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 * FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
 * 
 * OR
 * 
 * FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
 */

const admin = require('firebase-admin');

let firebaseApp = null;

function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    let credential;

    // Option 1: Use service account JSON file path
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      credential = admin.credential.cert(serviceAccount);
    }
    // Option 2: Use environment variables
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      });
    } else {
      console.warn('Firebase credentials not configured. Push notifications will be disabled.');
      return null;
    }

    firebaseApp = admin.initializeApp({
      credential: credential,
    });

    console.log('Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    return null;
  }
}

/**
 * Get Firebase Messaging instance
 */
function getMessaging() {
  const app = initializeFirebase();
  if (!app) {
    return null;
  }
  return admin.messaging();
}

/**
 * Send push notification to a single device
 * @param {string} fcmToken - The FCM token of the device
 * @param {object} notification - { title, body, imageUrl? }
 * @param {object} data - Additional data payload
 */
async function sendPushNotification(fcmToken, notification, data = {}) {
  const messaging = getMessaging();
  if (!messaging) {
    throw new Error('Firebase Messaging not initialized');
  }

  const message = {
    token: fcmToken,
    notification: {
      title: notification.title,
      body: notification.body,
      ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
    },
    data: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value)])
    ),
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
    webpush: {
      notification: {
        icon: '/icon.png',
        badge: '/badge.png',
      },
    },
  };

  try {
    console.log(`🚀 [Firebase] Sending notification to single token: ${fcmToken.substring(0, 30)}...`);
    const response = await messaging.send(message);
    console.log(`✅ [Firebase] Single notification sent successfully, MessageID: ${response}`);
    return { success: true, messageId: response };
  } catch (error) {
    console.error(`❌ [Firebase] Error sending push notification:`, error.code, error.message);
    throw error;
  }
}

/**
 * Send push notification to multiple devices
 * @param {string[]} fcmTokens - Array of FCM tokens
 * @param {object} notification - { title, body, imageUrl? }
 * @param {object} data - Additional data payload
 */
async function sendMulticastNotification(fcmTokens, notification, data = {}) {
  const messaging = getMessaging();
  if (!messaging) {
    throw new Error('Firebase Messaging not initialized');
  }

  if (!fcmTokens || fcmTokens.length === 0) {
    return { success: true, successCount: 0, failureCount: 0, responses: [] };
  }

  const message = {
    tokens: fcmTokens,
    notification: {
      title: notification.title,
      body: notification.body,
      ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
    },
    data: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value)])
    ),
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
  };

  try {
    console.log(`🚀 [Firebase] Sending multicast notification to ${fcmTokens.length} tokens`);
    const response = await messaging.sendEachForMulticast(message);
    console.log(`✅ [Firebase] Multicast sent: ${response.successCount} success, ${response.failureCount} failed`);
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
  } catch (error) {
    console.error(`❌ [Firebase] Error sending multicast notification:`, error.code, error.message);
    throw error;
  }
}

/**
 * Send notification to a topic
 * @param {string} topic - Topic name
 * @param {object} notification - { title, body, imageUrl? }
 * @param {object} data - Additional data payload
 */
async function sendTopicNotification(topic, notification, data = {}) {
  const messaging = getMessaging();
  if (!messaging) {
    throw new Error('Firebase Messaging not initialized');
  }

  const message = {
    topic: topic,
    notification: {
      title: notification.title,
      body: notification.body,
      ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
    },
    data: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value)])
    ),
  };

  try {
    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending topic notification:', error);
    throw error;
  }
}

/**
 * Subscribe tokens to a topic
 * @param {string[]} fcmTokens - Array of FCM tokens
 * @param {string} topic - Topic name
 */
async function subscribeToTopic(fcmTokens, topic) {
  const messaging = getMessaging();
  if (!messaging) {
    throw new Error('Firebase Messaging not initialized');
  }

  try {
    const response = await messaging.subscribeToTopic(fcmTokens, topic);
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    throw error;
  }
}

/**
 * Unsubscribe tokens from a topic
 * @param {string[]} fcmTokens - Array of FCM tokens
 * @param {string} topic - Topic name
 */
async function unsubscribeFromTopic(fcmTokens, topic) {
  const messaging = getMessaging();
  if (!messaging) {
    throw new Error('Firebase Messaging not initialized');
  }

  try {
    const response = await messaging.unsubscribeFromTopic(fcmTokens, topic);
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    throw error;
  }
}

module.exports = {
  initializeFirebase,
  getMessaging,
  sendPushNotification,
  sendMulticastNotification,
  sendTopicNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
};
