-- Add notes system to crew table
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS active_notes JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS archived_notes JSONB DEFAULT '[]';

-- Update existing records to have default values
UPDATE crew 
SET active_notes = '[]', archived_notes = '[]' 
WHERE active_notes IS NULL OR archived_notes IS NULL;
