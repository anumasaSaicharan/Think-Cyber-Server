-- Migration: Create subscription_plans table
-- Description: Create table to store subscription plan information

CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    features TEXT NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) CHECK (status IN ('Active', 'Draft', 'Inactive')) DEFAULT 'Draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_plans_status ON subscription_plans(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_subscription_plans_created_at ON subscription_plans(created_at DESC);

-- Create index on name for searching
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);

-- Insert sample subscription plans (optional)
INSERT INTO subscription_plans (name, features, description, status) 
VALUES 
    ('Basic Plan', 'Access to basic courses, Community support, Certificate of completion', 'Perfect for beginners starting their learning journey', 'Active'),
    ('Professional Plan', 'All Basic features, Priority support, Advanced courses, Project guidance', 'Ideal for professionals looking to advance their skills', 'Active'),
    ('Enterprise Plan', 'All Professional features, Dedicated account manager, Custom courses, API access', 'For organizations needing comprehensive learning solutions', 'Active')
ON CONFLICT (name) DO NOTHING;
