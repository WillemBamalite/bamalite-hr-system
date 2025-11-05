-- Add sick_leave_id column to stand_back_records table
-- This links the stand back record to the original sick leave

ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS sick_leave_id TEXT;

-- Add comment
COMMENT ON COLUMN stand_back_records.sick_leave_id IS 'Reference to the sick_leave record that generated this stand back requirement';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stand_back_sick_leave_id ON stand_back_records(sick_leave_id);

-- Success message
SELECT 'sick_leave_id column added successfully!' as result;



