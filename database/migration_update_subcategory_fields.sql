-- Migration script to update subcategory table with new fields
-- Add new columns to subcategory table

ALTER TABLE subcategory 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Draft')),
ADD COLUMN IF NOT EXISTS topics_count INTEGER DEFAULT 0;

-- Update existing subcategories with default values if needed
UPDATE subcategory 
SET 
    description = COALESCE(description, 'Subcategory description'),
    status = COALESCE(status, 'Active'),
    topics_count = COALESCE(topics_count, 0);

-- Add NOT NULL constraint after setting default values
ALTER TABLE subcategory 
ALTER COLUMN description SET NOT NULL,
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN topics_count SET NOT NULL;
