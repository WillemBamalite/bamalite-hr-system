-- ============================================
-- ADD CHECKLIST FIELDS TO INCIDENTS TABLE
-- Run dit script in Supabase SQL Editor
-- ============================================

-- Add checklist fields
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS verklaring_gemaakt BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verzekering_ingelicht BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS incidenten_rapport_nodig BOOLEAN DEFAULT false;

-- Add status_updates field for tracking updates (similar to tasks)
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS status_updates JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS status_update TEXT,
ADD COLUMN IF NOT EXISTS status_update_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for checklist fields
CREATE INDEX IF NOT EXISTS idx_incidents_verklaring_gemaakt ON incidents(verklaring_gemaakt) WHERE verklaring_gemaakt = false;
CREATE INDEX IF NOT EXISTS idx_incidents_verzekering_ingelicht ON incidents(verzekering_ingelicht) WHERE verzekering_ingelicht = false;
CREATE INDEX IF NOT EXISTS idx_incidents_rapport_nodig ON incidents(incidenten_rapport_nodig) WHERE incidenten_rapport_nodig = true;

-- Add comments
COMMENT ON COLUMN incidents.verklaring_gemaakt IS 'Checklist: Verklaring gemaakt';
COMMENT ON COLUMN incidents.verzekering_ingelicht IS 'Checklist: Verzekering ingelicht';
COMMENT ON COLUMN incidents.incidenten_rapport_nodig IS 'Checklist: Incidenten rapport nodig';
COMMENT ON COLUMN incidents.status_updates IS 'Array van status updates met text, at, by';
COMMENT ON COLUMN incidents.status_update IS 'Laatste status update tekst';
COMMENT ON COLUMN incidents.status_update_at IS 'Datum/tijd van laatste status update';

