-- Migration: Update existing bundle enrollments to include future topics
-- This ensures all existing bundle purchases get access to newly added topics
-- Created: 2025-12-19

UPDATE user_category_bundles 
SET future_topics_included = true 
WHERE payment_status = 'completed' AND future_topics_included = false;

-- Log the update
SELECT 'Updated ' || COUNT(*) || ' bundle enrollments to include future topics' as migration_result
FROM user_category_bundles 
WHERE payment_status = 'completed' AND future_topics_included = true;
