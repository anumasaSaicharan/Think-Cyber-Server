-- Migration for uploads table
-- This table stores metadata about all uploaded files

CREATE TABLE IF NOT EXISTS uploads (
    id VARCHAR(255) PRIMARY KEY,
    filename VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    upload_type VARCHAR(50) NOT NULL DEFAULT 'general',
    category VARCHAR(100) DEFAULT 'uncategorized',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_uploads_type ON uploads(upload_type);
CREATE INDEX IF NOT EXISTS idx_uploads_category ON uploads(category);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_uploads_mime_type ON uploads(mime_type);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_uploads_updated_at BEFORE UPDATE ON uploads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data (optional)
-- INSERT INTO uploads (id, filename, original_name, file_path, file_size, mime_type, upload_type, category) VALUES
-- ('sample-1', 'sample-image.jpg', 'My Image.jpg', '/uploads/images/sample-image.jpg', 102400, 'image/jpeg', 'image', 'samples'),
-- ('sample-2', 'sample-video.mp4', 'My Video.mp4', '/uploads/videos/sample-video.mp4', 10485760, 'video/mp4', 'video', 'samples');
