-- Migration: Add category plan feature flags
-- Adds annual_subscription, bundled_access, future_topics_included, flexible_purchase to category

BEGIN;

ALTER TABLE category
    ADD COLUMN IF NOT EXISTS annual_subscription BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS bundled_access BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS future_topics_included BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS flexible_purchase BOOLEAN DEFAULT false;

-- Ensure not null with default
ALTER TABLE category
    ALTER COLUMN annual_subscription SET DEFAULT false,
    ALTER COLUMN bundled_access SET DEFAULT false,
    ALTER COLUMN future_topics_included SET DEFAULT false,
    ALTER COLUMN flexible_purchase SET DEFAULT false;

UPDATE category SET 
    annual_subscription = COALESCE(annual_subscription, false),
    bundled_access = COALESCE(bundled_access, false),
    future_topics_included = COALESCE(future_topics_included, false),
    flexible_purchase = COALESCE(flexible_purchase, false);

COMMIT;
