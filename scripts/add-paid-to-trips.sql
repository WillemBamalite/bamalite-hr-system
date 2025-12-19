-- Add paid column to trips table for zelfstandige aflossers
-- This script adds a boolean column to track if a trip has been paid

ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN trips.paid IS 'Indicates if this trip has been paid (only relevant for zelfstandige aflossers)';

-- Create index for better performance on paid queries
CREATE INDEX IF NOT EXISTS idx_trips_paid ON trips(paid) WHERE paid = TRUE;



