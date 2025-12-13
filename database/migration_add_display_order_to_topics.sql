-- Add display_order column to topics table
ALTER TABLE topics ADD COLUMN display_order INTEGER DEFAULT 0;

-- Update existing topics to have display_order = 0 (redundant due to default, but good for clarity)
UPDATE topics SET display_order = 0 WHERE display_order IS NULL;
