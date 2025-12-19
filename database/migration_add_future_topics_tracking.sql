-- Migration: Add future_topics_included tracking to user_category_bundles
-- Enables filtering future topics based on bundle purchase plan type

BEGIN;

-- Add column to track if bundle purchase includes future topics
ALTER TABLE user_category_bundles
    ADD COLUMN IF NOT EXISTS future_topics_included BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing records - assume all existing bundles include future topics (can be adjusted based on your data)
UPDATE user_category_bundles 
SET future_topics_included = true
WHERE future_topics_included IS NULL;

-- Create index for efficient filtering when checking future topic access
CREATE INDEX IF NOT EXISTS idx_user_category_bundles_future_topics 
    ON user_category_bundles(user_id, category_id, future_topics_included)
    WHERE future_topics_included = true;

CREATE INDEX IF NOT EXISTS idx_user_category_bundles_enrolled_at
    ON user_category_bundles(user_id, enrolled_at);

COMMIT;
