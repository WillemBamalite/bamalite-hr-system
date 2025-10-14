-- Add sub_status and expected_start_date columns to crew table
-- These are used for the "Nog In Te Delen" workflow

-- Add sub_status column
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS sub_status TEXT;

-- Add expected_start_date column
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS expected_start_date DATE;

-- Add comment to explain the columns
COMMENT ON COLUMN crew.sub_status IS 'Sub-status for "nog-in-te-delen": nog-te-benaderen, wacht-op-startdatum, wachtlijst';
COMMENT ON COLUMN crew.expected_start_date IS 'Expected start date for crew members waiting to be assigned';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_crew_sub_status ON crew(sub_status);

-- Show success message
SELECT 'Columns added successfully!' as result;

