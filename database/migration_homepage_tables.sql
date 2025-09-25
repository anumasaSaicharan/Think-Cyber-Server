-- Migration for Homepage Content Tables
-- Run this migration to create homepage-related tables

-- Homepage main table
CREATE TABLE IF NOT EXISTS homepage (
    id SERIAL PRIMARY KEY,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(language)
);

-- Hero section table
CREATE TABLE IF NOT EXISTS homepage_hero (
    id SERIAL PRIMARY KEY,
    homepage_id INTEGER REFERENCES homepage(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    background_image TEXT,
    cta_text VARCHAR(100),
    cta_link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(homepage_id)
);

-- About section table
CREATE TABLE IF NOT EXISTS homepage_about (
    id SERIAL PRIMARY KEY,
    homepage_id INTEGER REFERENCES homepage(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    image TEXT,
    features JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(homepage_id)
);

-- Contact section table
CREATE TABLE IF NOT EXISTS homepage_contact (
    id SERIAL PRIMARY KEY,
    homepage_id INTEGER REFERENCES homepage(id) ON DELETE CASCADE,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    hours VARCHAR(100),
    description TEXT,
    support_email VARCHAR(255),
    sales_email VARCHAR(255),
    social_links JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(homepage_id)
);

-- FAQs table
CREATE TABLE IF NOT EXISTS homepage_faqs (
    id SERIAL PRIMARY KEY,
    homepage_id INTEGER REFERENCES homepage(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    order_index INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_homepage_language ON homepage(language);
CREATE INDEX IF NOT EXISTS idx_homepage_hero_homepage_id ON homepage_hero(homepage_id);
CREATE INDEX IF NOT EXISTS idx_homepage_about_homepage_id ON homepage_about(homepage_id);
CREATE INDEX IF NOT EXISTS idx_homepage_contact_homepage_id ON homepage_contact(homepage_id);
CREATE INDEX IF NOT EXISTS idx_homepage_faqs_homepage_id ON homepage_faqs(homepage_id);
CREATE INDEX IF NOT EXISTS idx_homepage_faqs_order ON homepage_faqs(order_index);
CREATE INDEX IF NOT EXISTS idx_homepage_faqs_active ON homepage_faqs(is_active);

-- Insert default English homepage data
INSERT INTO homepage (language, version, is_active) 
VALUES ('en', 1, true) 
ON CONFLICT (language) DO NOTHING;

-- Get the homepage ID for English
DO $$
DECLARE
    homepage_id_en INTEGER;
BEGIN
    SELECT id INTO homepage_id_en FROM homepage WHERE language = 'en';
    
    -- Insert default hero section
    INSERT INTO homepage_hero (homepage_id, title, subtitle, background_image, cta_text, cta_link)
    VALUES (homepage_id_en, 'Welcome to ThinkCyber', 'Advanced Cybersecurity Training Platform', 
            'https://example.com/hero-bg.jpg', 'Get Started', '/dashboard')
    ON CONFLICT DO NOTHING;
    
    -- Insert default about section
    INSERT INTO homepage_about (homepage_id, title, content, image, features)
    VALUES (homepage_id_en, 'About Our Platform', 
            'We provide comprehensive cybersecurity training designed to equip professionals with the skills needed to protect organizations from evolving cyber threats.',
            'https://example.com/about-image.jpg',
            '["Interactive Learning", "Real-world Scenarios", "Expert Instructors"]')
    ON CONFLICT DO NOTHING;
    
    -- Insert default contact section
    INSERT INTO homepage_contact (homepage_id, email, phone, address, hours, description, support_email, sales_email, social_links)
    VALUES (homepage_id_en, 'info@thinkcyber.com', '+1-555-0123', 
            '123 Security St, Cyber City, CC 12345', '9 AM - 6 PM EST',
            'Get in touch with our team', 'support@thinkcyber.com', 'sales@thinkcyber.com',
            '{"facebook": "https://facebook.com/thinkcyber", "twitter": "https://twitter.com/thinkcyber", "linkedin": "https://linkedin.com/company/thinkcyber"}')
    ON CONFLICT DO NOTHING;
    
    -- Insert default FAQs
    INSERT INTO homepage_faqs (homepage_id, question, answer, order_index, is_active)
    VALUES 
    (homepage_id_en, 'What is cybersecurity training?', 
     'Cybersecurity training teaches you to protect systems, networks, and data from digital attacks through comprehensive courses covering various security domains.',
     1, true),
    (homepage_id_en, 'How long are the courses?', 
     'Course duration varies from 2-12 weeks depending on the complexity and depth of the subject matter.',
     2, true),
    (homepage_id_en, 'Do you provide certifications?', 
     'Yes, we provide industry-recognized certifications upon successful completion of our courses.',
     3, true)
    ON CONFLICT DO NOTHING;
END $$;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_homepage_updated_at BEFORE UPDATE ON homepage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homepage_hero_updated_at BEFORE UPDATE ON homepage_hero
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homepage_about_updated_at BEFORE UPDATE ON homepage_about
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homepage_contact_updated_at BEFORE UPDATE ON homepage_contact
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homepage_faqs_updated_at BEFORE UPDATE ON homepage_faqs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
