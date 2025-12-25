-- Audit table for deleted users
CREATE TABLE IF NOT EXISTS deleted_users_audit (
    id SERIAL PRIMARY KEY,
    original_user_id INTEGER,
    email VARCHAR(255),
    name VARCHAR(255),
    reason TEXT,
    other_reason TEXT,
    full_user_data JSONB, -- Backup of the entire user record
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for searching
CREATE INDEX IF NOT EXISTS idx_deleted_users_email ON deleted_users_audit(email);
