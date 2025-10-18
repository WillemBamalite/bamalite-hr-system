-- Add aflosser_opmerkingen field to crew table
-- This field will store general comments about relief crew members

-- Add the aflosser_opmerkingen column to the crew table
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS aflosser_opmerkingen TEXT;

-- Add comment for documentation
COMMENT ON COLUMN crew.aflosser_opmerkingen IS 'General comments and notes about relief crew members';

-- Create index for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_crew_aflosser_opmerkingen ON crew(aflosser_opmerkingen) WHERE aflosser_opmerkingen IS NOT NULL;
