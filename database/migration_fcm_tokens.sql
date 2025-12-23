-- Migration: Add FCM tokens table for Firebase Cloud Messaging
-- Created: 2024-12-23

-- Table to store FCM device tokens for push notifications
CREATE TABLE IF NOT EXISTS user_fcm_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    fcm_token VARCHAR(500) NOT NULL,
    device_id VARCHAR(255),
    device_type VARCHAR(50), -- 'android', 'ios', 'web'
    device_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, fcm_token)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user_id ON user_fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_fcm_token ON user_fcm_tokens(fcm_token);
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_is_active ON user_fcm_tokens(is_active);

-- Table to store notification history (optional but recommended)
CREATE TABLE IF NOT EXISTS notification_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'delivered'
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for notification history
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
