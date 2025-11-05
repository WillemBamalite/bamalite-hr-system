-- Add education_completed_date column to crew table
ALTER TABLE crew
ADD COLUMN IF NOT EXISTS education_completed_date DATE;
