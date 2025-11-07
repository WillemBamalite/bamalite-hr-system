-- Update tasks table to allow "Nautic" in assigned_to column
-- Run this in Supabase SQL Editor

-- First, drop the existing check constraint
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_assigned_to_check;

-- Add a new check constraint that includes "Nautic"
ALTER TABLE tasks 
ADD CONSTRAINT tasks_assigned_to_check 
CHECK (assigned_to IN ('Nautic', 'Leo', 'Willem', 'Jos'));

