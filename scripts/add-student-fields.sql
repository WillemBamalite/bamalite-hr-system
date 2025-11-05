-- Add student fields to crew table
ALTER TABLE crew
ADD COLUMN IF NOT EXISTS is_student BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS education_type TEXT,
ADD COLUMN IF NOT EXISTS education_end_date DATE,
ADD COLUMN IF NOT EXISTS school_periods JSONB DEFAULT '[]';

-- Update existing records to have default values
UPDATE crew
SET is_student = false, school_periods = '[]'
WHERE is_student IS NULL OR school_periods IS NULL;
