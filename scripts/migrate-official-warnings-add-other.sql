-- Migration: extend official_warnings to support manual warnings
-- Run this in Supabase SQL editor AFTER the table exists.

-- 1) New column for manual reason text
ALTER TABLE public.official_warnings
  ADD COLUMN IF NOT EXISTS reason_text TEXT;

-- 2) performed_by becomes optional (manual warnings)
ALTER TABLE public.official_warnings
  ALTER COLUMN performed_by DROP NOT NULL;

-- 3) expires_at becomes optional (manual warnings)
ALTER TABLE public.official_warnings
  ALTER COLUMN expires_at DROP NOT NULL;

-- 4) Expand check constraint for test_type to include 'other'
DO $$
DECLARE
  c_name text;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'public.official_warnings'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%test_type%'
  LIMIT 1;

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.official_warnings DROP CONSTRAINT %I', c_name);
  END IF;
END $$;

ALTER TABLE public.official_warnings
  ADD CONSTRAINT official_warnings_test_type_check
  CHECK (test_type IN ('alcohol', 'drugs', 'other'));

