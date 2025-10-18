-- Add reason and notes columns to stand_back_records table
-- This script adds the missing columns that are needed for the new functionality

-- Add reason column for different types of stand-back situations
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS reason TEXT CHECK (reason IN ('ziekte', 'vrij genomen', 'verlof', 'training', 'school', 'overig')) DEFAULT 'ziekte';

-- Add notes column for additional information
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for better performance on reason field
CREATE INDEX IF NOT EXISTS idx_stand_back_reason ON stand_back_records(reason);

-- Add comments for documentation
COMMENT ON COLUMN stand_back_records.reason IS 'Type of stand-back situation: ziekte, vrij genomen, verlof, training, school, overig';
COMMENT ON COLUMN stand_back_records.notes IS 'Additional notes about the stand-back situation';
