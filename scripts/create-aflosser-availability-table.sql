-- ============================================
-- AFLOSSER BESCHIKBAARHEID TABEL
-- Run dit script in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS aflosser_availability_periods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  crew_id TEXT NOT NULL REFERENCES crew(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE, -- NULL betekent open einde
  type TEXT NOT NULL CHECK (type IN ('beschikbaar', 'afwezig')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE aflosser_availability_periods ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Enable all access for authenticated users" ON aflosser_availability_periods
  FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_aflosser_availability_crew_id ON aflosser_availability_periods(crew_id);
CREATE INDEX IF NOT EXISTS idx_aflosser_availability_start_date ON aflosser_availability_periods(start_date);
CREATE INDEX IF NOT EXISTS idx_aflosser_availability_end_date ON aflosser_availability_periods(end_date);
CREATE INDEX IF NOT EXISTS idx_aflosser_availability_type ON aflosser_availability_periods(type);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_aflosser_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_aflosser_availability_updated_at_trigger
    BEFORE UPDATE ON aflosser_availability_periods 
    FOR EACH ROW 
    EXECUTE FUNCTION update_aflosser_availability_updated_at();

-- Add comments for documentation
COMMENT ON TABLE aflosser_availability_periods IS 'Tabel voor het bijhouden van beschikbaarheids- en afwezigheidsperiodes van aflossers';
COMMENT ON COLUMN aflosser_availability_periods.type IS 'Type periode: beschikbaar of afwezig';
COMMENT ON COLUMN aflosser_availability_periods.end_date IS 'NULL betekent open einde (bijv. beschikbaar vanaf X datum)';

-- ============================================
-- SUCCESS!
-- ============================================
SELECT 'Aflosser availability table created successfully! 🎉' as result;

