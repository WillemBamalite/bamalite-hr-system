-- Add vaste_dienst field to crew table
-- This field indicates if a crew member is in fixed service (15 days per month required)

-- Add the vaste_dienst column to the crew table
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS vaste_dienst BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN crew.vaste_dienst IS 'Indicates if crew member is in fixed service (15 days per month required)';

-- Create index for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_crew_vaste_dienst ON crew(vaste_dienst) WHERE vaste_dienst = TRUE;
