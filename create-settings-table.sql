-- Create settings table for managing application settings
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to settings
CREATE POLICY "Enable read access for all users" ON settings
  FOR SELECT USING (true);

-- Allow super admins to update settings
CREATE POLICY "Enable update for all users" ON settings
  FOR UPDATE USING (true);

-- Allow super admins to insert settings
CREATE POLICY "Enable insert for all users" ON settings
  FOR INSERT WITH CHECK (true);

-- Insert default form title
INSERT INTO settings (key, value) 
VALUES ('form_title', 'Hifz Registration Form')
ON CONFLICT (key) DO NOTHING;

-- Insert default max registrations per slot
INSERT INTO settings (key, value) 
VALUES ('max_registrations_per_slot', '15')
ON CONFLICT (key) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
