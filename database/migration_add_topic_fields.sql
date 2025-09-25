-- Migration to add missing fields to topics table
-- This adds fields that are commonly used in frontend requests

-- Add missing fields to topics table
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS emoji VARCHAR(10),
ADD COLUMN IF NOT EXISTS learning_objectives TEXT,
ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS prerequisites TEXT;

-- Update timestamp trigger to include new fields
CREATE OR REPLACE FUNCTION update_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure trigger exists
DROP TRIGGER IF EXISTS update_topics_updated_at_trigger ON topics;
CREATE TRIGGER update_topics_updated_at_trigger
    BEFORE UPDATE ON topics
    FOR EACH ROW
    EXECUTE FUNCTION update_topics_updated_at();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_topics_emoji ON topics(emoji);
CREATE INDEX IF NOT EXISTS idx_topics_target_audience ON topics USING GIN(target_audience);
