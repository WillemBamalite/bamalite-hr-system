-- ============================================
-- VERIFY created_by COLUMN EXISTS
-- Run dit script in Supabase SQL Editor om te controleren
-- ============================================

-- Check if created_by column exists in tasks table
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks' 
  AND column_name = 'created_by';

-- Check current constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'tasks'::regclass
  AND conname = 'tasks_assigned_to_check';



