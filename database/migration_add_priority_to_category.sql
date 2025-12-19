-- Migration: Add priority column to category table
-- Description: Add priority field to control the order of categories display

ALTER TABLE category
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Create index on priority for faster sorting
CREATE INDEX IF NOT EXISTS idx_category_priority ON category(priority DESC);

-- Set default priorities based on existing records (oldest first get higher priority)
UPDATE category 
SET priority = (SELECT COUNT(*) FROM category c2 WHERE c2.created_at <= category.created_at)
WHERE priority = 0;
