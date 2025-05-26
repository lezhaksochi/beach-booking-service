-- Migration to add authentication system

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add user_id to bookings table
ALTER TABLE bookings ADD COLUMN user_id UUID REFERENCES users(id);

-- Make customer fields optional since they'll be derived from user
ALTER TABLE bookings ALTER COLUMN customer_name DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN customer_phone DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN customer_email DROP NOT NULL;

-- Create indexes for performance
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);

-- Add trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update lounger_type enum to use 'chair' instead of 'sunbed'
ALTER TYPE lounger_type RENAME TO lounger_type_old;
CREATE TYPE lounger_type AS ENUM ('chair', 'bungalow');
ALTER TABLE loungers ALTER COLUMN type TYPE lounger_type USING type::text::lounger_type;
DROP TYPE lounger_type_old;