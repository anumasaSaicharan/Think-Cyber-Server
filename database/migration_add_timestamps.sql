-- Migration script to add timestamp columns to existing tables
-- Run this if you already have existing category and subcategory tables

-- Add timestamp columns to category table
ALTER TABLE category 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add timestamp columns to subcategory table  
ALTER TABLE subcategory 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create trigger function to update 'updated_at' column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic updated_at updates
DROP TRIGGER IF EXISTS update_category_updated_at ON category;
CREATE TRIGGER update_category_updated_at 
    BEFORE UPDATE ON category 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subcategory_updated_at ON subcategory;
CREATE TRIGGER update_subcategory_updated_at 
    BEFORE UPDATE ON subcategory 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
