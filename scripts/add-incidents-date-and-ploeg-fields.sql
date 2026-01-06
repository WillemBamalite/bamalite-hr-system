-- ============================================
-- ADD INCIDENT DATE, PLOEG AND VERZEKERING AFGEROND FIELDS
-- Run dit script in Supabase SQL Editor
-- ============================================

-- Add incident_date field (datum van het incident zelf, niet wanneer het gemeld is)
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS incident_date DATE;

-- Add ploeg field (Ploeg A of Ploeg B) - alleen relevant voor ship incidenten
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS ploeg TEXT CHECK (ploeg IN ('Ploeg A', 'Ploeg B')) DEFAULT NULL;

-- Add verzekering_afgerond to checklist
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS verzekering_afgerond BOOLEAN DEFAULT false;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_incidents_incident_date ON incidents(incident_date);
CREATE INDEX IF NOT EXISTS idx_incidents_ploeg ON incidents(ploeg) WHERE ploeg IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_verzekering_afgerond ON incidents(verzekering_afgerond) WHERE verzekering_afgerond = false;

-- Add comments
COMMENT ON COLUMN incidents.incident_date IS 'Datum waarop het incident heeft plaatsgevonden';
COMMENT ON COLUMN incidents.ploeg IS 'Ploeg (A of B) - alleen relevant voor ship incidenten';
COMMENT ON COLUMN incidents.verzekering_afgerond IS 'Checklist: Verzekering afgerond';

