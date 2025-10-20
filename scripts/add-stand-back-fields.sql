-- Add new fields to stand_back_records table for extended functionality

-- Add reason field for different types of stand-back situations
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT 'ziekte';

-- Add archive status to support completed and terminated employee records
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS archive_status TEXT DEFAULT 'openstaand';

-- Add notes field for additional information
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add archived_at timestamp for when record was archived
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add archived_by field to track who archived the record
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS archived_by TEXT;

-- Add constraints for the new fields
ALTER TABLE stand_back_records 
ADD CONSTRAINT IF NOT EXISTS stand_back_records_reason_check 
CHECK (reason IN ('ziekte', 'vrij genomen', 'verlof', 'training', 'overig'));

ALTER TABLE stand_back_records 
ADD CONSTRAINT IF NOT EXISTS stand_back_records_archive_status_check 
CHECK (archive_status IN ('openstaand', 'voltooid', 'gearchiveerd-uitdienst'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stand_back_reason ON stand_back_records(reason);
CREATE INDEX IF NOT EXISTS idx_stand_back_archive_status ON stand_back_records(archive_status);
CREATE INDEX IF NOT EXISTS idx_stand_back_archived_at ON stand_back_records(archived_at);

