-- Create agenda_items table for calendar/agenda functionality
-- This table stores calendar events and agenda items

CREATE TABLE IF NOT EXISTS agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on date for faster queries
CREATE INDEX IF NOT EXISTS idx_agenda_items_date ON agenda_items(date);

-- Create index on date and time for sorting
CREATE INDEX IF NOT EXISTS idx_agenda_items_date_time ON agenda_items(date, time NULLS LAST);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_agenda_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agenda_items_updated_at
  BEFORE UPDATE ON agenda_items
  FOR EACH ROW
  EXECUTE FUNCTION update_agenda_items_updated_at();

-- Add comments
COMMENT ON TABLE agenda_items IS 'Calendar events and agenda items';
COMMENT ON COLUMN agenda_items.title IS 'Title of the agenda item';
COMMENT ON COLUMN agenda_items.description IS 'Optional description/details';
COMMENT ON COLUMN agenda_items.date IS 'Date of the agenda item';
COMMENT ON COLUMN agenda_items.time IS 'Optional time of the agenda item';

