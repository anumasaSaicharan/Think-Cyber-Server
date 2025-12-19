-- Migration: Create user_category_bundles table for tracking bundle purchases

-- Create user_category_bundles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_category_bundles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    order_id VARCHAR(255),
    payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, category_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_category_bundles_user_id ON user_category_bundles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_category_bundles_category_id ON user_category_bundles(category_id);
CREATE INDEX IF NOT EXISTS idx_user_category_bundles_payment_status ON user_category_bundles(payment_status);

-- Add comment to table
COMMENT ON TABLE user_category_bundles IS 'Tracks user purchases of category bundles';
COMMENT ON COLUMN user_category_bundles.payment_status IS 'Payment status: pending, completed, failed';
