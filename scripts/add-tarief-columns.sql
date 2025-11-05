-- Add tarief columns to crew table for uitzendbureau and zelfstandige aflossers
-- This script adds the necessary columns to support daily rates for relief crew

-- Add is_zelfstandig column (boolean)
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS is_zelfstandig BOOLEAN DEFAULT FALSE;

-- Add dag_tarief column (decimal for euro amounts)
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS dag_tarief DECIMAL(10,2) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN crew.is_zelfstandig IS 'Indicates if this crew member is a self-employed relief crew member';
COMMENT ON COLUMN crew.dag_tarief IS 'Daily rate in euros for uitzendbureau or zelfstandige relief crew members';

-- Create index for better performance on zelfstandig queries
CREATE INDEX IF NOT EXISTS idx_crew_is_zelfstandig ON crew(is_zelfstandig);

-- Update existing records if needed (optional)
-- UPDATE crew SET is_zelfstandig = FALSE WHERE is_zelfstandig IS NULL;
-- UPDATE crew SET dag_tarief = NULL WHERE dag_tarief IS NULL;
