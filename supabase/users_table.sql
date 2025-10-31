-- ============================================
-- USERS TABLE FOR STAFF AUTHENTICATION
-- ============================================
-- Run this in your Supabase SQL Editor

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'coordinator', 'navigator')),
    assigned_locations TEXT[],
    is_active BOOLEAN DEFAULT true,
    two_factor_enabled BOOLEAN DEFAULT false,
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Insert default demo users (password is 'password123' for all)
-- Using ON CONFLICT to avoid duplicate errors if already exists
INSERT INTO users (id, email, password_hash, full_name, role, assigned_locations, is_active)
VALUES 
    ('USR001', 'admin@multinav.com', 'password123', 'System Administrator', 'admin', 
     ARRAY['Canning', 'Gosnells', 'Mandurah', 'Stirling', 'Swan', 'Wanneroo'], true),
    ('USR002', 'coordinator@multinav.com', 'password123', 'Program Coordinator', 'coordinator', 
     ARRAY['Canning', 'Gosnells'], true),
    ('USR003', 'navigator@multinav.com', 'password123', 'Health Navigator', 'navigator', 
     ARRAY['Stirling'], true)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    assigned_locations = EXCLUDED.assigned_locations;

-- Grant permissions for authenticated users
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO anon;

-- Add RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all users
CREATE POLICY "Users can read all users" ON users
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert new users
CREATE POLICY "Users can insert new users" ON users
    FOR INSERT
    WITH CHECK (true);

-- Allow authenticated users to update users
CREATE POLICY "Users can update users" ON users
    FOR UPDATE
    USING (true);

-- Allow authenticated users to delete users
CREATE POLICY "Users can delete users" ON users
    FOR DELETE
    USING (true);

-- Display the current users
SELECT id, email, full_name, role, is_active FROM users ORDER BY created_at;


