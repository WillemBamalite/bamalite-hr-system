-- ============================================
-- INCIDENTEN TABEL SCRIPT
-- Run dit script in Supabase SQL Editor
-- ============================================

-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('ship', 'crew', 'algemeen', 'veiligheid', 'technisch', 'personeel')),
  related_ship_id TEXT REFERENCES ships(id) ON DELETE SET NULL,
  related_crew_id TEXT REFERENCES crew(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('laag', 'normaal', 'hoog', 'kritiek')) DEFAULT 'normaal',
  status TEXT NOT NULL CHECK (status IN ('open', 'in_behandeling', 'opgelost', 'geannuleerd')) DEFAULT 'open',
  reported_by TEXT,
  assigned_to TEXT CHECK (assigned_to IN ('Nautic', 'Leo', 'Jos', 'Willem', 'Bart')),
  reported_date DATE NOT NULL DEFAULT CURRENT_DATE,
  resolved_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Enable all access for authenticated users" ON incidents
  FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX idx_incidents_type ON incidents(incident_type);
CREATE INDEX idx_incidents_ship_id ON incidents(related_ship_id) WHERE related_ship_id IS NOT NULL;
CREATE INDEX idx_incidents_crew_id ON incidents(related_crew_id) WHERE related_crew_id IS NOT NULL;
CREATE INDEX idx_incidents_status ON incidents(status) WHERE status IN ('open', 'in_behandeling');
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX idx_incidents_reported_date ON incidents(reported_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_incidents_updated_at();

-- Add comments for documentation
COMMENT ON TABLE incidents IS 'Incidenten registratie voor schepen, bemanning en algemene incidenten';
COMMENT ON COLUMN incidents.incident_type IS 'Type incident: ship, crew, algemeen, veiligheid, technisch, personeel';
COMMENT ON COLUMN incidents.severity IS 'Ernst van het incident: laag, normaal, hoog, kritiek';
COMMENT ON COLUMN incidents.status IS 'Status: open, in_behandeling, opgelost, geannuleerd';

