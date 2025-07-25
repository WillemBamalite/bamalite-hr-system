-- Database schema for Bamalite HR System
-- Run this in your Supabase SQL editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create crew table
CREATE TABLE IF NOT EXISTS crew (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nationality TEXT NOT NULL,
  position TEXT NOT NULL,
  ship_id TEXT NOT NULL,
  regime TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT CHECK (status IN ('aan-boord', 'thuis', 'nog-in-te-delen', 'ziek', 'uit-dienst')) NOT NULL,
  on_board_since DATE,
  thuis_sinds DATE,
  birth_date DATE NOT NULL,
  address JSONB NOT NULL,
  assignment_history JSONB DEFAULT '[]',
  diplomas TEXT[] DEFAULT '{}',
  notes JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ships table
CREATE TABLE IF NOT EXISTS ships (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('Operationeel', 'In onderhoud', 'Uit dienst')) NOT NULL,
  max_crew INTEGER NOT NULL,
  location TEXT NOT NULL,
  route TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sick_leave table
CREATE TABLE IF NOT EXISTS sick_leave (
  id TEXT PRIMARY KEY,
  crew_member_id TEXT NOT NULL REFERENCES crew(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  certificate_valid_until DATE,
  notes TEXT NOT NULL,
  status TEXT CHECK (status IN ('actief', 'wacht-op-briefje', 'afgerond')) NOT NULL,
  paid_by TEXT NOT NULL,
  salary_percentage INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sick_leave_history table
CREATE TABLE IF NOT EXISTS sick_leave_history (
  id TEXT PRIMARY KEY,
  crew_member_id TEXT NOT NULL REFERENCES crew(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('ziek', 'terug-staan')) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  note TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_crew_ship_id ON crew(ship_id);
CREATE INDEX IF NOT EXISTS idx_crew_status ON crew(status);
CREATE INDEX IF NOT EXISTS idx_sick_leave_crew_member_id ON sick_leave(crew_member_id);
CREATE INDEX IF NOT EXISTS idx_sick_leave_status ON sick_leave(status);
CREATE INDEX IF NOT EXISTS idx_sick_leave_history_crew_member_id ON sick_leave_history(crew_member_id);

-- Enable Row Level Security (RLS)
ALTER TABLE crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE ships ENABLE ROW LEVEL SECURITY;
ALTER TABLE sick_leave ENABLE ROW LEVEL SECURITY;
ALTER TABLE sick_leave_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (for now, we'll make it public)
-- In production, you'd want proper authentication
CREATE POLICY "Allow public read access to crew" ON crew FOR SELECT USING (true);
CREATE POLICY "Allow public read access to ships" ON ships FOR SELECT USING (true);
CREATE POLICY "Allow public read access to sick_leave" ON sick_leave FOR SELECT USING (true);
CREATE POLICY "Allow public read access to sick_leave_history" ON sick_leave_history FOR SELECT USING (true);

-- Allow public insert/update/delete for now (we'll add proper auth later)
CREATE POLICY "Allow public insert to crew" ON crew FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to crew" ON crew FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to crew" ON crew FOR DELETE USING (true);

CREATE POLICY "Allow public insert to ships" ON ships FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to ships" ON ships FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to ships" ON ships FOR DELETE USING (true);

CREATE POLICY "Allow public insert to sick_leave" ON sick_leave FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to sick_leave" ON sick_leave FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to sick_leave" ON sick_leave FOR DELETE USING (true);

CREATE POLICY "Allow public insert to sick_leave_history" ON sick_leave_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to sick_leave_history" ON sick_leave_history FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to sick_leave_history" ON sick_leave_history FOR DELETE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_crew_updated_at BEFORE UPDATE ON crew FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ships_updated_at BEFORE UPDATE ON ships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sick_leave_updated_at BEFORE UPDATE ON sick_leave FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sick_leave_history_updated_at BEFORE UPDATE ON sick_leave_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 