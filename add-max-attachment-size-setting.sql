-- Add default max attachment size setting (in KB)
-- Default is 400 KB
-- Execute this in PocketBase Admin UI > Settings > Import collections

INSERT INTO settings (key, value) 
VALUES ('max_attachment_size_kb', '400')
ON CONFLICT (key) DO NOTHING;
