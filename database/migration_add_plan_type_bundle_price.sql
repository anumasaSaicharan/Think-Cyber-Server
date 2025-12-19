-- Migration: add plan_type, bundle_price, and subscription_plan_id to category table
-- Safely adds new pricing fields to support plan-aware categories

BEGIN;

-- Add columns if they don't exist
ALTER TABLE category
    ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'FREE',
    ADD COLUMN IF NOT EXISTS bundle_price NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS subscription_plan_id INTEGER REFERENCES subscription_plans(id);

-- Backfill defaults for existing rows
UPDATE category
SET 
    plan_type = COALESCE(plan_type, 'FREE'),
    bundle_price = COALESCE(bundle_price, 0)
WHERE plan_type IS NULL OR bundle_price IS NULL;

-- Enforce constraints
ALTER TABLE category DROP CONSTRAINT IF EXISTS category_plan_type_check;
ALTER TABLE category DROP CONSTRAINT IF EXISTS category_bundle_price_non_negative;
ALTER TABLE category
    ALTER COLUMN plan_type SET NOT NULL,
    ALTER COLUMN bundle_price SET DEFAULT 0,
    ADD CONSTRAINT category_plan_type_check CHECK (plan_type IN ('FREE','INDIVIDUAL','BUNDLE','FLEXIBLE')),
    ADD CONSTRAINT category_bundle_price_non_negative CHECK (bundle_price >= 0);

-- Helpful index for plan-based queries
CREATE INDEX IF NOT EXISTS idx_category_plan_type ON category(plan_type);

COMMIT;
