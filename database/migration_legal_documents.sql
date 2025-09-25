-- Migration script to create terms_conditions and privacy_policies tables

-- Create terms_conditions table
CREATE TABLE IF NOT EXISTS terms_conditions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    version VARCHAR(50) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'Inactive', 'Archived')),
    effective_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'admin',
    updated_by VARCHAR(100) DEFAULT 'admin'
);

-- Create privacy_policies table
CREATE TABLE IF NOT EXISTS privacy_policies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    version VARCHAR(50) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'Inactive', 'Archived')),
    effective_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'admin',
    updated_by VARCHAR(100) DEFAULT 'admin'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_terms_conditions_status ON terms_conditions(status);
CREATE INDEX IF NOT EXISTS idx_terms_conditions_language ON terms_conditions(language);
CREATE INDEX IF NOT EXISTS idx_terms_conditions_version ON terms_conditions(version);

CREATE INDEX IF NOT EXISTS idx_privacy_policies_status ON privacy_policies(status);
CREATE INDEX IF NOT EXISTS idx_privacy_policies_language ON privacy_policies(language);
CREATE INDEX IF NOT EXISTS idx_privacy_policies_version ON privacy_policies(version);
