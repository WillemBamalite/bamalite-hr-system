-- Update stand_back_records table to support all types of stand-back reasons
-- and archive functionality

-- Add reason field for different types of stand-back situations
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS reason TEXT CHECK (reason IN ('ziekte', 'vrij genomen', 'verlof', 'training', 'overig')) DEFAULT 'ziekte';

-- Add archive status to support completed and terminated employee records
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS archive_status TEXT CHECK (archive_status IN ('openstaand', 'voltooid', 'gearchiveerd-uitdienst')) DEFAULT 'openstaand';

-- Add notes field for additional information
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add archived_at timestamp for when record was archived
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add archived_by field to track who archived the record
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS archived_by TEXT;

-- Update the stand_back_status constraint to include new archive status
ALTER TABLE stand_back_records 
DROP CONSTRAINT IF EXISTS stand_back_records_stand_back_status_check;

ALTER TABLE stand_back_records 
ADD CONSTRAINT stand_back_records_stand_back_status_check 
CHECK (stand_back_status IN ('openstaand', 'voltooid'));

-- Create index for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_stand_back_reason ON stand_back_records(reason);
CREATE INDEX IF NOT EXISTS idx_stand_back_archive_status ON stand_back_records(archive_status);
CREATE INDEX IF NOT EXISTS idx_stand_back_archived_at ON stand_back_records(archived_at);

-- Add comments for documentation
COMMENT ON COLUMN stand_back_records.reason IS 'Type of stand-back situation: ziekte, vrij genomen, verlof, training, overig';
COMMENT ON COLUMN stand_back_records.archive_status IS 'Archive status: openstaand, voltooid, gearchiveerd-uitdienst';
COMMENT ON COLUMN stand_back_records.notes IS 'Additional notes about the stand-back situation';
COMMENT ON COLUMN stand_back_records.archived_at IS 'Timestamp when record was archived';
COMMENT ON COLUMN stand_back_records.archived_by IS 'User who archived the record';
