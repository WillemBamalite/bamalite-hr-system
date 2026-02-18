-- ============================================
-- INCIDENT INTERVIEWS TABEL SCRIPT
-- Run dit script in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS incident_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Koppeling naar incidentrapport
  report_id UUID REFERENCES incident_reports(id) ON DELETE CASCADE,

  -- Persoon
  person_name TEXT NOT NULL,
  role TEXT,                   -- rang / functie
  experience TEXT,             -- bijv. "5 jaar op dit traject"

  -- Manning / certificaten
  rhine_patent TEXT,           -- bijv. nummer of Y/N
  sailing_licence TEXT,
  radar_license TEXT,
  vhf_certificate TEXT,
  adn_basic TEXT,
  adn_c TEXT,
  tank_barge_experience TEXT,  -- bijv. "10 jaar tankvaart"

  -- Menselijke factoren
  rest_hours TEXT,             -- rust in uren (bijv. "8 uur in laatste 24u")
  work_hours_48h TEXT,         -- werkuren laatste 48u
  stress_factors TEXT,
  distraction_factors TEXT,

  -- Interviewinhoud
  free_statement TEXT,         -- vrije verklaring
  observations TEXT,           -- waarnemingen
  actions TEXT,                -- acties
  decisions TEXT,              -- besluitvorming
  expectations TEXT,           -- verwachtingen
  deviations TEXT,             -- afwijkingen t.o.v. normaal / procedure

  -- Procedurecheck
  procedure_exists BOOLEAN,
  procedure_followed BOOLEAN,
  procedure_not_followed_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE incident_interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users on incident_interviews"
  ON incident_interviews;

CREATE POLICY "Enable all access for authenticated users on incident_interviews"
ON incident_interviews
FOR ALL
USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_incident_interviews_report_id
  ON incident_interviews(report_id);

