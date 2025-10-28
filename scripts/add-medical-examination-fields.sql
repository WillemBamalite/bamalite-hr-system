-- Add medical examination fields to crew table
-- For tracking medical examinations required for inland waterway workers

-- Add fields for medical examination tracking
ALTER TABLE crew
ADD COLUMN IF NOT EXISTS laatste_keuring_datum DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fit_verklaard BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS proeftijd_datum DATE DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN crew.laatste_keuring_datum IS 'Date of last medical examination';
COMMENT ON COLUMN crew.fit_verklaard IS 'Whether the crew member was declared fit (true) or not fit (false) at last examination';
COMMENT ON COLUMN crew.proeftijd_datum IS 'Start date of probation period (for new crew members, used to calculate +3 months +1 year deadline)';

-- Create index for better performance on medical examination queries
CREATE INDEX IF NOT EXISTS idx_crew_laatste_keuring_datum ON crew(laatste_keuring_datum);

