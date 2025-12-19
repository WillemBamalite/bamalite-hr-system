-- ============================================
-- TAKEN TABEL SCRIPT
-- Run dit script in Supabase SQL Editor
-- ============================================

-- Drop table if exists (let op: dit verwijdert alle bestaande taken!)
DROP TABLE IF EXISTS tasks CASCADE;

-- Create tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('ship', 'crew')),
  related_ship_id TEXT REFERENCES ships(id) ON DELETE CASCADE,
  related_crew_id TEXT REFERENCES crew(id) ON DELETE CASCADE,
  related_ship_visit_id TEXT REFERENCES ship_visits(id) ON DELETE SET NULL,
  assigned_to TEXT NOT NULL CHECK (assigned_to IN ('Leo', 'Jos', 'Willem')),
  priority TEXT NOT NULL CHECK (priority IN ('laag', 'normaal', 'hoog', 'urgent')) DEFAULT 'normaal',
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  deadline DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Enable all access for authenticated users" ON tasks
  FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX idx_tasks_type ON tasks(task_type);
CREATE INDEX idx_tasks_ship_id ON tasks(related_ship_id) WHERE related_ship_id IS NOT NULL;
CREATE INDEX idx_tasks_crew_id ON tasks(related_crew_id) WHERE related_crew_id IS NOT NULL;
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_completed ON tasks(completed) WHERE completed = false;
CREATE INDEX idx_tasks_deadline ON tasks(deadline) WHERE deadline IS NOT NULL;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at_trigger
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_tasks_updated_at();

-- ============================================
-- SUCCESS!
-- ============================================
SELECT 'Tasks table created successfully! 🎉' as result;
