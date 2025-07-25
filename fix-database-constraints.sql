-- Fix database constraints for Bamalite HR System
-- Run this in your Supabase SQL editor to make optional fields nullable

-- Make birth_date nullable (many crew members don't have birth dates)
ALTER TABLE crew ALTER COLUMN birth_date DROP NOT NULL;

-- Make ship_id nullable (some crew members might not be assigned to a ship)
ALTER TABLE crew ALTER COLUMN ship_id DROP NOT NULL;

-- Make address nullable (some crew members might not have complete address info)
ALTER TABLE crew ALTER COLUMN address DROP NOT NULL;

-- Make start_date nullable in sick_leave (some records might not have start dates)
ALTER TABLE sick_leave ALTER COLUMN start_date DROP NOT NULL;

-- Make start_date nullable in sick_leave_history (some records might not have start dates)
ALTER TABLE sick_leave_history ALTER COLUMN start_date DROP NOT NULL;

-- Make notes nullable in sick_leave (some records might not have notes)
ALTER TABLE sick_leave ALTER COLUMN notes DROP NOT NULL;

-- Make note nullable in sick_leave_history (some records might not have notes)
ALTER TABLE sick_leave_history ALTER COLUMN note DROP NOT NULL;

-- Make paid_by nullable in sick_leave (some records might not specify who pays)
ALTER TABLE sick_leave ALTER COLUMN paid_by DROP NOT NULL;

-- Make salary_percentage nullable in sick_leave (some records might not specify salary percentage)
ALTER TABLE sick_leave ALTER COLUMN salary_percentage DROP NOT NULL;

-- Update the status check constraint to include 'nog-in-te-delen' if not already present
-- (This is already in the original schema, but making sure it's there)
ALTER TABLE crew DROP CONSTRAINT IF EXISTS crew_status_check;
ALTER TABLE crew ADD CONSTRAINT crew_status_check 
  CHECK (status IN ('aan-boord', 'thuis', 'nog-in-te-delen', 'ziek', 'uit-dienst'));

-- Add foreign key constraint for ship_id if it doesn't exist
ALTER TABLE crew ADD CONSTRAINT IF NOT EXISTS fk_crew_ship 
  FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE SET NULL; 