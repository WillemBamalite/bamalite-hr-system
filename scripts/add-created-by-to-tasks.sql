-- ============================================
-- ADD created_by COLUMN TO TASKS TABLE
-- Run dit script in Supabase SQL Editor
-- ============================================

-- Add created_by column if it doesn't exist
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Update constraint to include 'Nautic' if not already present
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_assigned_to_check;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_assigned_to_check 
CHECK (assigned_to IN ('Nautic', 'Leo', 'Jos', 'Willem'));

-- ============================================
-- SUCCESS!
-- ============================================
SELECT 'created_by column added to tasks table successfully! 🎉' as result;



