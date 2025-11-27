-- Add is_dummy column to crew table
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT FALSE;

