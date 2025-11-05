-- Create trips table for the new 4-step workflow
-- Fixed version with correct foreign key types (TEXT instead of UUID)
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_name TEXT NOT NULL,
  ship_id TEXT REFERENCES ships(id),
  start_date DATE NOT NULL,
  end_date DATE,
  trip_from TEXT NOT NULL,
  trip_to TEXT NOT NULL,
  notes TEXT,
  
  -- New workflow fields
  status TEXT CHECK (status IN ('gepland', 'ingedeeld', 'actief', 'voltooid')) DEFAULT 'gepland',
  aflosser_id TEXT REFERENCES crew(id),
  
  -- Actual boarding/leaving times
  start_datum TIMESTAMP WITH TIME ZONE,
  start_tijd TIME,
  eind_datum TIMESTAMP WITH TIME ZONE,
  eind_tijd TIME,
  
  -- Aflosser feedback
  aflosser_opmerkingen TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_ship_id ON trips(ship_id);
CREATE INDEX IF NOT EXISTS idx_trips_aflosser_id ON trips(aflosser_id);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date);

-- Add comments for documentation
COMMENT ON TABLE trips IS 'Trips table for managing aflosser assignments with 4-step workflow';
COMMENT ON COLUMN trips.status IS 'Trip status: gepland, ingedeeld, actief, voltooid';
COMMENT ON COLUMN trips.aflosser_id IS 'Assigned aflosser for this trip';
COMMENT ON COLUMN trips.start_datum IS 'Actual date when aflosser boarded the ship';
COMMENT ON COLUMN trips.start_tijd IS 'Actual time when aflosser boarded the ship';
COMMENT ON COLUMN trips.eind_datum IS 'Actual date when aflosser left the ship';
COMMENT ON COLUMN trips.eind_tijd IS 'Actual time when aflosser left the ship';
COMMENT ON COLUMN trips.aflosser_opmerkingen IS 'Optional notes about the aflosser performance/behavior';

