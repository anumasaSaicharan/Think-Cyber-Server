-- Migration: Add account closure requests table
-- Created: 2024-12-23

-- Table to store account closure requests
CREATE TABLE IF NOT EXISTS account_closure_requests (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
    admin_notes TEXT,
    processed_by INTEGER REFERENCES users(id),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add is_active column to users table if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add deactivated_at column to users table if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'deactivated_at') THEN
        ALTER TABLE users ADD COLUMN deactivated_at TIMESTAMP;
    END IF;
END $$;

-- Add deactivation_reason column to users table if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'deactivation_reason') THEN
        ALTER TABLE users ADD COLUMN deactivation_reason TEXT;
    END IF;
END $$;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_account_closure_user_id ON account_closure_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_closure_status ON account_closure_requests(status);
CREATE INDEX IF NOT EXISTS idx_account_closure_request_id ON account_closure_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
