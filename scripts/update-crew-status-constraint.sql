-- Update crew status constraint to allow all required status values
-- This script fixes the "crew_status_check" constraint error

-- First, drop the existing constraint
ALTER TABLE crew DROP CONSTRAINT IF EXISTS crew_status_check;

-- Then add the new constraint with all required status values
ALTER TABLE crew ADD CONSTRAINT crew_status_check 
CHECK (status IN ('aan-boord', 'thuis', 'nog-in-te-delen', 'ziek', 'uit-dienst', 'afwezig'));

-- Verify the constraint was added correctly
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'crew_status_check'; 