-- ============================================
-- SCHEEPSBEZOEKEN TABEL SCRIPT
-- Run dit script in Supabase SQL Editor
-- ============================================

-- Create ship_visits table
CREATE TABLE IF NOT EXISTS ship_visits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ship_id TEXT NOT NULL REFERENCES ships(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  visit_time TIME,
  visited_by TEXT NOT NULL CHECK (visited_by IN ('Leo', 'Jos', 'Willem', 'Bart', 'Nautic')),
  crew_present TEXT[] DEFAULT '{}', -- Array van crew IDs
  notes TEXT,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE ship_visits ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Enable all access for authenticated users" ON ship_visits
  FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ship_visits_ship_id ON ship_visits(ship_id);
CREATE INDEX IF NOT EXISTS idx_ship_visits_visit_date ON ship_visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_ship_visits_visited_by ON ship_visits(visited_by);
CREATE INDEX IF NOT EXISTS idx_ship_visits_follow_up ON ship_visits(follow_up_needed) WHERE follow_up_needed = true;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ship_visits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ship_visits_updated_at_trigger
    BEFORE UPDATE ON ship_visits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_ship_visits_updated_at();

-- Add comments for documentation
COMMENT ON TABLE ship_visits IS 'Tabel voor het bijhouden van scheepsbezoeken';
COMMENT ON COLUMN ship_visits.crew_present IS 'Array van crew member IDs die aan boord waren tijdens het bezoek';
COMMENT ON COLUMN ship_visits.follow_up_needed IS 'Of er een follow-up actie nodig is (wordt automatisch een taak van gemaakt)';

-- ============================================
-- SUCCESS!
-- ============================================
SELECT 'Ship visits table created successfully! 🎉' as result;

