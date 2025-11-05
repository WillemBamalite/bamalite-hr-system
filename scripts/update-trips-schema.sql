-- Update trips table to support new 4-step workflow
-- Add new status and timing fields for better trip management

-- Add status field for trip workflow (gepland, ingedeeld, actief, voltooid)
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('gepland', 'ingedeeld', 'actief', 'voltooid')) DEFAULT 'gepland';

-- Add timing fields for when aflosser actually boards and leaves
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS start_datum TIMESTAMP WITH TIME ZONE;

ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS start_tijd TIME;

ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS eind_datum TIMESTAMP WITH TIME ZONE;

ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS eind_tijd TIME;

-- Add notes field for aflosser feedback
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS aflosser_opmerkingen TEXT;

-- Create index for better performance on status
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);

-- Add comments for documentation
COMMENT ON COLUMN trips.status IS 'Trip status: gepland, ingedeeld, actief, voltooid';
COMMENT ON COLUMN trips.start_datum IS 'Actual date when aflosser boarded the ship';
COMMENT ON COLUMN trips.start_tijd IS 'Actual time when aflosser boarded the ship';
COMMENT ON COLUMN trips.eind_datum IS 'Actual date when aflosser left the ship';
COMMENT ON COLUMN trips.eind_tijd IS 'Actual time when aflosser left the ship';
COMMENT ON COLUMN trips.aflosser_opmerkingen IS 'Optional notes about the aflosser performance/behavior';

