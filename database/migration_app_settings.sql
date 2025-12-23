-- Migration: Add app settings table for force update and other configurations
-- Created: 2024-12-23

-- Table to store app configuration settings
CREATE TABLE IF NOT EXISTS app_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default app version settings
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES (
    'app_version',
    '{
        "updateRequired": false,
        "forceUpdate": false,
        "latestVersionName": "1.0.0",
        "latestVersionCode": 1,
        "minVersionCode": 1,
        "message": "A new version is available with exciting features and improvements.",
        "androidStoreUrl": "https://play.google.com/store/apps/details?id=com.thinkcyber.app",
        "iosStoreUrl": "https://apps.apple.com/app/thinkcyber/id123456789"
    }'::jsonb,
    'Mobile app version settings for force update functionality'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);
