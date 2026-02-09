-- Insert default supervisor name setting (Generic SQL - PocketBase handles this via API usually, but good to have for initial seed if migrating)
INSERT INTO settings (key, value) 
VALUES ('supervisor_name', 'Farheen');
