-- Migration: Add welcome notification tracking to users table
-- Tracks if user has received welcome notification on first login

ALTER TABLE users ADD COLUMN IF NOT EXISTS has_received_welcome BOOLEAN DEFAULT false;

-- Update existing users to mark they've already been welcomed
-- (optional - comment out if you want to send welcome to existing users on next login)
-- UPDATE users SET has_received_welcome = true WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day';
