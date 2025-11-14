-- Add three new mandatory text fields to registrations table
-- Education, Profession, and Previous Hifz

ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS education TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS profession TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS previous_hifz TEXT NOT NULL DEFAULT '';

-- Remove default constraints after adding columns (for future inserts)
ALTER TABLE registrations 
ALTER COLUMN education DROP DEFAULT,
ALTER COLUMN profession DROP DEFAULT,
ALTER COLUMN previous_hifz DROP DEFAULT;
