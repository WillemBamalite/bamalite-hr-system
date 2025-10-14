-- Add out_of_service_date and out_of_service_reason columns to crew table
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS out_of_service_date DATE;

ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS out_of_service_reason TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN crew.out_of_service_date IS 'Date when crew member was set to out-of-service status';
COMMENT ON COLUMN crew.out_of_service_reason IS 'Reason for setting crew member to out-of-service status';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_crew_out_of_service ON crew(out_of_service_date) WHERE status = 'uit-dienst';

