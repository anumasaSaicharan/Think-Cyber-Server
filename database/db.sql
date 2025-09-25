-- Table to store OTP verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    name VARCHAR(50),
    address VARCHAR(100),
    phone VARCHAR(15)
);

-- Example for categories and subcategories
CREATE TABLE category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subcategory (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    category_id INTEGER REFERENCES category(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);