-- Add missing columns to crew table
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS birth_place TEXT,
ADD COLUMN IF NOT EXISTS matricule TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS smoking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS experience TEXT;

-- Add comments to explain the columns
COMMENT ON COLUMN crew.birth_place IS 'Place of birth of crew member';
COMMENT ON COLUMN crew.matricule IS 'Matricule number of crew member';
COMMENT ON COLUMN crew.company IS 'Company that crew member works for';
COMMENT ON COLUMN crew.smoking IS 'Whether crew member smokes';
COMMENT ON COLUMN crew.experience IS 'Work experience description';

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_crew_company ON crew(company);
CREATE INDEX IF NOT EXISTS idx_crew_matricule ON crew(matricule);

