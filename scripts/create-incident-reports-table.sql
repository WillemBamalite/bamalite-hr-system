-- ============================================
-- INCIDENT REPORTS TABEL SCRIPT
-- Run dit script in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Optionele koppeling aan een bestaand incident uit de incidents-tabel
  related_incident_id TEXT REFERENCES incidents(id) ON DELETE SET NULL,

  incident_number TEXT,                 -- Vrij nummer / referentie
  title TEXT NOT NULL,                  -- Korte titel van het incident
  incident_type TEXT,                   -- Vrij veld (bijv. ship / crew / veiligheid etc.)

  -- Schip / bedrijf (intern of extern)
  internal_ship_id TEXT REFERENCES ships(id) ON DELETE SET NULL,
  external_ship_name TEXT,
  internal_company TEXT,
  external_company TEXT,

  -- Datum / tijd / locatie
  incident_date DATE,
  incident_time TIME,
  location_description TEXT,
  location_gps TEXT,

  -- Reisgegevens
  loaded BOOLEAN,                       -- TRUE = geladen, FALSE = leeg, NULL = onbekend
  product TEXT,
  quantity NUMERIC,
  voyage_from TEXT,
  voyage_to TEXT,
  departure_date DATE,
  arrival_date DATE,

  -- Status van het onderzoeksdossier
  status TEXT DEFAULT 'basis' CHECK (status IN ('basis','interviews','analyse','afgerond')),

  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

-- Policy: alle geauthenticeerde gebruikers mogen lezen/schrijven
CREATE POLICY IF NOT EXISTS "Enable all access for authenticated users on incident_reports"
ON incident_reports
FOR ALL USING (auth.role() = 'authenticated');

-- Indexen voor performance
CREATE INDEX IF NOT EXISTS idx_incident_reports_incident_date ON incident_reports(incident_date);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_incident_reports_related_incident ON incident_reports(related_incident_id);

-- Trigger voor updated_at
CREATE OR REPLACE FUNCTION update_incident_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_incident_reports_updated_at
  BEFORE UPDATE ON incident_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_incident_reports_updated_at();

