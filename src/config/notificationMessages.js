// Notification messages configuration
// You can easily modify these messages without changing code

const notificationMessages = {
  // Welcome/Login notification
  WELCOME: {
    title: "Welcome Back! 👋",
    body: "Great to see you again! Explore our latest cybersecurity courses and stay protected.",
    type: "success",
    icon: "waving_hand"
  },

  // First time login
  FIRST_LOGIN: {
    title: "Welcome to ThinkCyber! 🎉",
    body: "Thank you for joining us! Start your cybersecurity journey today with our curated courses.",
    type: "success",
    icon: "celebration"
  },

  // Topic Enrollment
  TOPIC_ENROLLED: {
    title: "Enrollment Successful! ✅",
    body: "You have successfully enrolled in '{topicTitle}'. Start learning now!",
    type: "success",
    icon: "check_circle"
  },

  // Bundle Purchase
  BUNDLE_PURCHASED: {
    title: "Bundle Unlocked! 🎁",
    body: "You now have access to all topics in '{categoryName}'. Happy learning!",
    type: "success",
    icon: "card_giftcard"
  },

  // Payment Success
  PAYMENT_SUCCESS: {
    title: "Payment Successful! 💳",
    body: "Your payment of {amount} has been processed successfully.",
    type: "success",
    icon: "payment"
  },

  // Payment Failed
  PAYMENT_FAILED: {
    title: "Payment Failed ❌",
    body: "Your payment could not be processed. Please try again or contact support.",
    type: "error",
    icon: "error"
  },

  // Account Closure Request
  ACCOUNT_CLOSURE: {
    title: "Account Closure Requested",
    body: "Your account closure request has been submitted. We're sorry to see you go.",
    type: "warning",
    icon: "account_circle"
  },

  // New Topic Available (for bundle subscribers)
  NEW_TOPIC_AVAILABLE: {
    title: "New Topic Available! 🆕",
    body: "A new topic '{topicTitle}' has been added to '{categoryName}'. Check it out!",
    type: "info",
    icon: "new_releases"
  },

  // Course Completion
  COURSE_COMPLETED: {
    title: "Congratulations! 🏆",
    body: "You have completed '{topicTitle}'. Keep up the great work!",
    type: "success",
    icon: "emoji_events"
  },

  // Reminder to continue learning
  LEARNING_REMINDER: {
    title: "Continue Your Learning 📚",
    body: "You haven't visited in a while. Pick up where you left off!",
    type: "info",
    icon: "school"
  },

  // Subscription Expiring Soon
  SUBSCRIPTION_EXPIRING: {
    title: "Subscription Expiring Soon ⏰",
    body: "Your subscription expires in {days} days. Renew now to keep learning!",
    type: "warning",
    icon: "schedule"
  },

  // Subscription Expired
  SUBSCRIPTION_EXPIRED: {
    title: "Subscription Expired",
    body: "Your subscription has expired. Renew to regain access to premium content.",
    type: "error",
    icon: "event_busy"
  },

  // Special Offer/Promotion
  SPECIAL_OFFER: {
    title: "Special Offer! 🎯",
    body: "{offerMessage}",
    type: "info",
    icon: "local_offer"
  },

  // Progress Milestone
  PROGRESS_MILESTONE: {
    title: "Milestone Reached! 🌟",
    body: "You've completed {percentage}% of '{topicTitle}'. Keep going!",
    type: "success",
    icon: "trending_up"
  }
};

// Helper function to replace placeholders in messages
const formatMessage = (template, variables = {}) => {
  let message = template;
  Object.keys(variables).forEach(key => {
    message = message.replace(new RegExp(`{${key}}`, 'g'), variables[key]);
  });
  return message;
};

// Get formatted notification
const getNotification = (type, variables = {}) => {
  const template = notificationMessages[type];
  if (!template) {
    console.error(`Unknown notification type: ${type}`);
    return null;
  }

  return {
    title: formatMessage(template.title, variables),
    body: formatMessage(template.body, variables),
    type: template.type,
    icon: template.icon
  };
};

module.exports = {
  notificationMessages,
  formatMessage,
  getNotification
};
