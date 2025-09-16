-- Create stand_back_records table
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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_stand_back_crew_member_id ON stand_back_records(crew_member_id);
CREATE INDEX IF NOT EXISTS idx_stand_back_status ON stand_back_records(stand_back_status);
CREATE INDEX IF NOT EXISTS idx_stand_back_remaining ON stand_back_records(stand_back_days_remaining);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stand_back_records_updated_at 
    BEFORE UPDATE ON stand_back_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 