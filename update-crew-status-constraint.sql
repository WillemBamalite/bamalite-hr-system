-- Update crew status constraint to allow 'afwezig' status
-- Run this in your Supabase SQL editor

-- First, drop the existing constraint
ALTER TABLE crew DROP CONSTRAINT IF EXISTS crew_status_check;

-- Then add the new constraint with 'afwezig' included
ALTER TABLE crew ADD CONSTRAINT crew_status_check 
CHECK (status IN ('aan-boord', 'thuis', 'nog-in-te-delen', 'ziek', 'uit-dienst', 'afwezig'));

-- Verify the constraint was added correctly
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'crew'::regclass AND conname = 'crew_status_check'; 