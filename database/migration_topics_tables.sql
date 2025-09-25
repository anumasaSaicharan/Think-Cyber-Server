-- Migration for Topics Management Tables
-- Run this migration to create topics-related tables

-- Topics main table
CREATE TABLE IF NOT EXISTS topics (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category_id INTEGER REFERENCES category(id) ON DELETE SET NULL,
    subcategory_id INTEGER REFERENCES subcategory(id) ON DELETE SET NULL,
    difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_featured BOOLEAN DEFAULT false,
    is_free BOOLEAN DEFAULT true,
    price DECIMAL(10,2) DEFAULT 0.00,
    duration_minutes INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    tags JSONB DEFAULT '[]',
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT,
    author_id INTEGER,
    published_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    enrollment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Topics modules table
CREATE TABLE IF NOT EXISTS topic_modules (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    duration_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Topics videos table
CREATE TABLE IF NOT EXISTS topic_videos (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    module_id INTEGER REFERENCES topic_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url TEXT,
    video_type VARCHAR(20) DEFAULT 'mp4' CHECK (video_type IN ('mp4', 'youtube', 'vimeo', 'stream')),
    thumbnail_url TEXT,
    duration_seconds INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_preview BOOLEAN DEFAULT false,
    transcript TEXT,
    resources JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Topics enrollments table
CREATE TABLE IF NOT EXISTS topic_enrollments (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled'))
);

-- Topics progress tracking table
CREATE TABLE IF NOT EXISTS topic_progress (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    module_id INTEGER REFERENCES topic_modules(id) ON DELETE CASCADE,
    video_id INTEGER REFERENCES topic_videos(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    watch_time_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(topic_id, module_id, video_id, user_id)
);

-- Topics reviews table
CREATE TABLE IF NOT EXISTS topic_reviews (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(topic_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_topics_category_id ON topics(category_id);
CREATE INDEX IF NOT EXISTS idx_topics_subcategory_id ON topics(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);
CREATE INDEX IF NOT EXISTS idx_topics_is_featured ON topics(is_featured);
CREATE INDEX IF NOT EXISTS idx_topics_is_free ON topics(is_free);
CREATE INDEX IF NOT EXISTS idx_topics_difficulty ON topics(difficulty);
CREATE INDEX IF NOT EXISTS idx_topics_published_at ON topics(published_at);
CREATE INDEX IF NOT EXISTS idx_topics_slug ON topics(slug);
CREATE INDEX IF NOT EXISTS idx_topics_tags ON topics USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_topic_modules_topic_id ON topic_modules(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_modules_order ON topic_modules(order_index);

CREATE INDEX IF NOT EXISTS idx_topic_videos_topic_id ON topic_videos(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_videos_module_id ON topic_videos(module_id);
CREATE INDEX IF NOT EXISTS idx_topic_videos_order ON topic_videos(order_index);

CREATE INDEX IF NOT EXISTS idx_topic_enrollments_topic_id ON topic_enrollments(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_enrollments_user_id ON topic_enrollments(user_id);

CREATE INDEX IF NOT EXISTS idx_topic_progress_topic_id ON topic_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_user_id ON topic_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_topic_reviews_topic_id ON topic_reviews(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_reviews_user_id ON topic_reviews(user_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topic_modules_updated_at BEFORE UPDATE ON topic_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topic_videos_updated_at BEFORE UPDATE ON topic_videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topic_progress_updated_at BEFORE UPDATE ON topic_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topic_reviews_updated_at BEFORE UPDATE ON topic_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
DO $$
DECLARE
    category_id_cybersecurity INTEGER;
    subcategory_id_ethical_hacking INTEGER;
    topic_id_sample INTEGER;
    module_id_sample INTEGER;
BEGIN
    -- Get or create a category
    SELECT id INTO category_id_cybersecurity FROM category WHERE name = 'Cybersecurity' LIMIT 1;
    IF category_id_cybersecurity IS NULL THEN
        INSERT INTO category (name, description, status, topics_count) VALUES ('Cybersecurity', 'Cybersecurity and Information Security topics', 'Active', 0) RETURNING id INTO category_id_cybersecurity;
    END IF;
    
    -- Get or create a subcategory
    SELECT id INTO subcategory_id_ethical_hacking FROM subcategory WHERE name = 'Ethical Hacking' LIMIT 1;
    IF subcategory_id_ethical_hacking IS NULL THEN
        INSERT INTO subcategory (name, category_id, description, status, topics_count) VALUES ('Ethical Hacking', category_id_cybersecurity, 'Ethical hacking and penetration testing', 'Active', 0) RETURNING id INTO subcategory_id_ethical_hacking;
    END IF;
    
    -- Insert sample topic
    INSERT INTO topics (
        title, description, content, slug, category_id, subcategory_id, 
        difficulty, status, is_featured, is_free, duration_minutes,
        tags, meta_title, meta_description
    ) VALUES (
        'Introduction to Ethical Hacking',
        'Learn the fundamentals of ethical hacking and penetration testing',
        'This comprehensive course covers the basics of ethical hacking, including reconnaissance, scanning, enumeration, and vulnerability assessment.',
        'introduction-to-ethical-hacking',
        category_id_cybersecurity,
        subcategory_id_ethical_hacking,
        'beginner',
        'published',
        true,
        true,
        180,
        '["ethical hacking", "penetration testing", "cybersecurity", "beginner"]',
        'Introduction to Ethical Hacking - Complete Beginner Course',
        'Master the fundamentals of ethical hacking with this comprehensive beginner-friendly course'
    ) RETURNING id INTO topic_id_sample;
    
    -- Insert sample module
    INSERT INTO topic_modules (
        topic_id, title, description, order_index, duration_minutes
    ) VALUES (
        topic_id_sample,
        'Getting Started with Ethical Hacking',
        'Introduction to ethical hacking concepts and methodology',
        1,
        60
    ) RETURNING id INTO module_id_sample;
    
    -- Insert sample videos
    INSERT INTO topic_videos (
        topic_id, module_id, title, description, video_type, 
        duration_seconds, order_index, is_preview
    ) VALUES 
    (
        topic_id_sample,
        module_id_sample,
        'What is Ethical Hacking?',
        'Understanding the difference between ethical hacking and malicious hacking',
        'mp4',
        900,
        1,
        true
    ),
    (
        topic_id_sample,
        module_id_sample,
        'Setting up Your Lab Environment',
        'How to set up a virtual lab for practicing ethical hacking',
        'mp4',
        1200,
        2,
        false
    ),
    (
        topic_id_sample,
        module_id_sample,
        'Legal and Ethical Considerations',
        'Understanding the legal framework and ethical guidelines',
        'mp4',
        800,
        3,
        false
    );
    
END $$;
