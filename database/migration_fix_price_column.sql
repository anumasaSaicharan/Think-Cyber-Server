-- Migration: Make price column nullable and add default value
-- Description: Fix price column constraint to allow NULL or default to 0

ALTER TABLE category
ALTER COLUMN price SET DEFAULT 0,
ALTER COLUMN price DROP NOT NULL;

-- Update any existing NULL values to 0
UPDATE category SET price = 0 WHERE price IS NULL;
