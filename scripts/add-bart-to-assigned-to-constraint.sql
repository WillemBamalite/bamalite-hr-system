-- ============================================
-- ADD 'Bart' TO assigned_to CONSTRAINT
-- Run dit script in Supabase SQL Editor
-- ============================================

-- Drop de bestaande constraint
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_assigned_to_check;

-- Voeg de constraint opnieuw toe met 'Bart' erbij
ALTER TABLE tasks 
ADD CONSTRAINT tasks_assigned_to_check 
CHECK (assigned_to IN ('Nautic', 'Leo', 'Jos', 'Willem', 'Bart'));

-- ============================================
-- SUCCESS!
-- ============================================
SELECT 'Bart toegevoegd aan assigned_to constraint successfully! 🎉' as result;

