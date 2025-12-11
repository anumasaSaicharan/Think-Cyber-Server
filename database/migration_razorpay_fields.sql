-- Add Razorpay fields to user_topics table
ALTER TABLE user_topics 
ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_topics_razorpay_order ON user_topics(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_user_topics_razorpay_payment ON user_topics(razorpay_payment_id);
