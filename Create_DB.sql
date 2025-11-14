-- ============================================
-- Complete Database Schema for Registration Application
-- ============================================
-- This script creates all tables, functions, triggers, and policies
-- needed for the registration application to work with PostgreSQL
-- ============================================

-- ============================================
-- TABLES
-- ============================================

-- Create slots table
CREATE TABLE IF NOT EXISTS slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  slot_order INTEGER NOT NULL,
  max_registrations INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table for admin authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'slot_admin')),
  assigned_slot_id UUID REFERENCES slots(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  fathers_name TEXT,
  date_of_birth DATE NOT NULL,
  email TEXT NOT NULL,
  whatsapp_mobile TEXT UNIQUE NOT NULL,
  tajweed_level TEXT NOT NULL CHECK (tajweed_level IN ('Beginner', 'Intermediate', 'Advanced')),
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settings table for application configuration
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_registrations_slot_id ON registrations(slot_id);
CREATE INDEX IF NOT EXISTS idx_registrations_whatsapp ON registrations(whatsapp_mobile);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_assigned_slot ON users(assigned_slot_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_slots_order ON slots(slot_order);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for settings table
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Note: RLS is Supabase-specific. For standard PostgreSQL,
-- you'll need to implement authorization in your application layer.
-- These are included for reference if migrating from Supabase.

-- Enable RLS on all tables
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Slots table policies
CREATE POLICY "Enable read access for all users" ON slots
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON slots
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON slots
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON slots
  FOR DELETE USING (true);

-- Users table policies
CREATE POLICY "Enable read access for all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON users
  FOR DELETE USING (true);

-- Registrations table policies
CREATE POLICY "Enable read access for all users" ON registrations
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON registrations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON registrations
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON registrations
  FOR DELETE USING (true);

-- Settings table policies
CREATE POLICY "Enable read access for all users" ON settings
  FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON settings
  FOR UPDATE USING (true);

CREATE POLICY "Enable insert for all users" ON settings
  FOR INSERT WITH CHECK (true);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default settings
INSERT INTO settings (key, value) 
VALUES ('form_title', 'Hifz Registration Form')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value) 
VALUES ('max_registrations_per_slot', '15')
ON CONFLICT (key) DO NOTHING;

-- Insert default super admin user (username: admin, password: admin123)
-- IMPORTANT: Change this password immediately after first login!
INSERT INTO users (username, password, role, name)
VALUES ('admin', 'admin123', 'super_admin', 'Super Administrator')
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- SAMPLE SLOTS (Optional - Remove if not needed)
-- ============================================

-- Uncomment the following lines to insert sample time slots:
/*
INSERT INTO slots (display_name, slot_order, max_registrations) VALUES
('Monday - 5:00 PM to 6:00 PM', 1, 15),
('Tuesday - 5:00 PM to 6:00 PM', 2, 15),
('Wednesday - 5:00 PM to 6:00 PM', 3, 15),
('Thursday - 5:00 PM to 6:00 PM', 4, 15),
('Friday - 5:00 PM to 6:00 PM', 5, 15),
('Saturday - 5:00 PM to 6:00 PM', 6, 15),
('Sunday - 5:00 PM to 6:00 PM', 7, 15)
ON CONFLICT DO NOTHING;
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the setup:
/*
SELECT 'Tables Created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('slots', 'users', 'registrations', 'settings');

SELECT 'Default Settings:' as status;
SELECT * FROM settings;

SELECT 'Default Admin User:' as status;
SELECT id, username, role, name FROM users WHERE role = 'super_admin';
*/
