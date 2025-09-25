-- Migration script to update category table with new fields
-- Add new columns to category table

ALTER TABLE category 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Draft')),
ADD COLUMN IF NOT EXISTS topics_count INTEGER DEFAULT 0;

-- Update existing categories with default values if needed
UPDATE category 
SET 
    description = 'Category description',
    status = 'Active',
    topics_count = 0
WHERE description IS NULL OR status IS NULL OR topics_count IS NULL;

-- Add NOT NULL constraint after setting default values
ALTER TABLE category 
ALTER COLUMN description SET NOT NULL,
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN topics_count SET NOT NULL;

-- Create function to automatically update topics_count when subcategories are added/removed
CREATE OR REPLACE FUNCTION update_category_topics_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE category 
        SET topics_count = topics_count + 1 
        WHERE id = NEW.category_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE category 
        SET topics_count = topics_count - 1 
        WHERE id = OLD.category_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update topics_count
DROP TRIGGER IF EXISTS update_topics_count ON subcategory;
CREATE TRIGGER update_topics_count 
    AFTER INSERT OR DELETE ON subcategory 
    FOR EACH ROW 
    EXECUTE FUNCTION update_category_topics_count();
