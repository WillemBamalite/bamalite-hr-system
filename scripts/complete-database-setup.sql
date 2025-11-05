-- Complete Database Setup Script
-- Voer dit script uit in de Supabase SQL Editor om alle nieuwe functionaliteit te activeren

-- ==============================================
-- 1. ADD AFLOSSER_OPMERKINGEN FIELD TO CREW TABLE
-- ==============================================
-- Add aflosser_opmerkingen field to crew table
-- This field will store general comments about relief crew members

ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS aflosser_opmerkingen TEXT;

-- Add comment for documentation
COMMENT ON COLUMN crew.aflosser_opmerkingen IS 'General comments and notes about relief crew members';

-- Create index for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_crew_aflosser_opmerkingen ON crew(aflosser_opmerkingen) WHERE aflosser_opmerkingen IS NOT NULL;

-- ==============================================
-- 2. ADD VASTE_DIENST FIELD TO CREW TABLE
-- ==============================================
-- Add vaste_dienst field to crew table
-- This field indicates if a crew member is in fixed service (15 days per month required)

ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS vaste_dienst BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN crew.vaste_dienst IS 'Indicates if crew member is in fixed service (15 days per month required)';

-- Create index for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_crew_vaste_dienst ON crew(vaste_dienst) WHERE vaste_dienst = TRUE;

-- ==============================================
-- 3. CREATE VASTE_DIENST_RECORDS TABLE
-- ==============================================
-- Create vaste_dienst_records table for tracking monthly work days
-- This table tracks how many days relief crew members work each month
-- and maintains a running balance of surplus/deficit days

CREATE TABLE IF NOT EXISTS vaste_dienst_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aflosser_id TEXT REFERENCES crew(id) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  required_days INTEGER DEFAULT 15,
  actual_days DECIMAL(4,1) DEFAULT 0,
  balance_days DECIMAL(4,1) DEFAULT 0, -- Running balance (can be negative)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per aflosser per month
  UNIQUE(aflosser_id, year, month)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vaste_dienst_aflosser_id ON vaste_dienst_records(aflosser_id);
CREATE INDEX IF NOT EXISTS idx_vaste_dienst_year_month ON vaste_dienst_records(year, month);
CREATE INDEX IF NOT EXISTS idx_vaste_dienst_balance ON vaste_dienst_records(balance_days);

-- Add comments for documentation
COMMENT ON TABLE vaste_dienst_records IS 'Tracks monthly work days for relief crew members in fixed service';
COMMENT ON COLUMN vaste_dienst_records.required_days IS 'Required days per month (usually 15)';
COMMENT ON COLUMN vaste_dienst_records.actual_days IS 'Actual days worked this month';
COMMENT ON COLUMN vaste_dienst_records.balance_days IS 'Running balance of surplus/deficit days';

-- ==============================================
-- 4. CREATE TRIPS TABLE (if not exists)
-- ==============================================
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

-- ==============================================
-- 5. UPDATE STAND_BACK_RECORDS TABLE (if needed)
-- ==============================================
-- Update stand_back_records table to support all types of stand-back situations
-- and archive functionality

-- Add reason field for different types of stand-back situations
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS reason TEXT CHECK (reason IN ('ziekte', 'vrij genomen', 'verlof', 'training', 'school', 'overig')) DEFAULT 'ziekte';

-- Add archive status to support completed and terminated employee records
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS archive_status TEXT CHECK (archive_status IN ('openstaand', 'voltooid', 'gearchiveerd-uitdienst')) DEFAULT 'openstaand';

-- Add notes field for additional information
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add archived_at timestamp for when record was archived
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add archived_by field to track who archived the record
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS archived_by TEXT;

-- Update the stand_back_status constraint to include new archive status
ALTER TABLE stand_back_records 
DROP CONSTRAINT IF EXISTS stand_back_records_stand_back_status_check;

ALTER TABLE stand_back_records 
ADD CONSTRAINT stand_back_records_stand_back_status_check 
CHECK (stand_back_status IN ('openstaand', 'voltooid'));

-- Create index for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_stand_back_reason ON stand_back_records(reason);
CREATE INDEX IF NOT EXISTS idx_stand_back_archive_status ON stand_back_records(archive_status);
CREATE INDEX IF NOT EXISTS idx_stand_back_archived_at ON stand_back_records(archived_at);

-- Add comments for documentation
COMMENT ON COLUMN stand_back_records.reason IS 'Type of stand-back situation: ziekte, vrij genomen, verlof, training, school, overig';
COMMENT ON COLUMN stand_back_records.archive_status IS 'Archive status: openstaand, voltooid, gearchiveerd-uitdienst';
COMMENT ON COLUMN stand_back_records.notes IS 'Additional notes about the stand-back situation';
COMMENT ON COLUMN stand_back_records.archived_at IS 'Timestamp when record was archived';
COMMENT ON COLUMN stand_back_records.archived_by IS 'User who archived the record';

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================
-- If you see this message, all database changes have been applied successfully!
-- You can now use all the new features:
-- - Algemene opmerkingen voor aflossers
-- - Vaste dienst tracking (15 dagen per maand)
-- - 4-stappen workflow voor reizen (gepland -> ingedeeld -> actief -> voltooid)
-- - Uitgebreide terug-te-staan dagen beheer
-- - Werkdagen berekening met 12:00 regel

