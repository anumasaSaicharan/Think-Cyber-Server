-- Migration: Add type column to subscription_plans table
-- Description: Add type field to categorize subscription plans

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Standard';

-- Create index on type for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_plans_type ON subscription_plans(type);

-- Update existing records with type if needed
UPDATE subscription_plans 
SET type = 'Standard' 
WHERE type IS NULL;
