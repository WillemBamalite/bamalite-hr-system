-- ============================================
-- COMPLETE MIGRATIE SCRIPT
-- Run dit script in Supabase SQL Editor
-- ============================================

-- STAP 1: Out-of-Service velden toevoegen
-- ============================================
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS out_of_service_date DATE;

ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS out_of_service_reason TEXT;

COMMENT ON COLUMN crew.out_of_service_date IS 'Date when crew member was set to out-of-service status';
COMMENT ON COLUMN crew.out_of_service_reason IS 'Reason for setting crew member to out-of-service status';

CREATE INDEX IF NOT EXISTS idx_crew_out_of_service ON crew(out_of_service_date) WHERE status = 'uit-dienst';


-- STAP 2: Missing Crew velden toevoegen
-- ============================================
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS birth_place TEXT,
ADD COLUMN IF NOT EXISTS matricule TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS smoking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS experience TEXT;

COMMENT ON COLUMN crew.birth_place IS 'Place of birth of crew member';
COMMENT ON COLUMN crew.matricule IS 'Matricule number of crew member';
COMMENT ON COLUMN crew.company IS 'Company that crew member works for';
COMMENT ON COLUMN crew.smoking IS 'Whether crew member smokes';
COMMENT ON COLUMN crew.experience IS 'Work experience description';

CREATE INDEX IF NOT EXISTS idx_crew_company ON crew(company);
CREATE INDEX IF NOT EXISTS idx_crew_matricule ON crew(matricule);


-- STAP 3: Sub-status en Expected Start Date toevoegen
-- ============================================
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS sub_status TEXT;

ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS expected_start_date DATE;

COMMENT ON COLUMN crew.sub_status IS 'Sub-status for "nog-in-te-delen": nog-te-benaderen, wacht-op-startdatum, wachtlijst';
COMMENT ON COLUMN crew.expected_start_date IS 'Expected start date for crew members waiting to be assigned';

CREATE INDEX IF NOT EXISTS idx_crew_sub_status ON crew(sub_status);
CREATE INDEX IF NOT EXISTS idx_crew_expected_start_date ON crew(expected_start_date);


-- STAP 4: Stand Back Records Tabel Aanmaken
-- ============================================
-- Create stand_back_records table voor terug-staan-dagen na ziekte
CREATE TABLE IF NOT EXISTS stand_back_records (
  id TEXT PRIMARY KEY,
  crew_member_id TEXT REFERENCES crew(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER DEFAULT 0,
  description TEXT NOT NULL,
  stand_back_days_required INTEGER NOT NULL,
  stand_back_days_completed INTEGER DEFAULT 0,
  stand_back_days_remaining INTEGER NOT NULL,
  stand_back_status TEXT CHECK (stand_back_status IN ('openstaand', 'voltooid')) DEFAULT 'openstaand',
  stand_back_history JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE stand_back_records ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Enable all access for authenticated users" ON stand_back_records
  FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stand_back_crew_member_id ON stand_back_records(crew_member_id);
CREATE INDEX IF NOT EXISTS idx_stand_back_status ON stand_back_records(stand_back_status);
CREATE INDEX IF NOT EXISTS idx_stand_back_remaining ON stand_back_records(stand_back_days_remaining);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stand_back_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stand_back_records_updated_at_trigger
    BEFORE UPDATE ON stand_back_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_stand_back_records_updated_at();


-- ============================================
-- SUCCESS!
-- ============================================
SELECT 'Migration completed successfully! 🎉' as result;
SELECT 'Next step: Settings → API → "Restart API"' as next_step;

