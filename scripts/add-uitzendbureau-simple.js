// Simple script to add uitzendbureau fields to crew table
// Run this in Supabase SQL Editor

console.log(`
-- Add uitzendbureau fields to crew table
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS is_uitzendbureau BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS uitzendbureau_naam TEXT;

-- Update existing records to have default values
UPDATE crew 
SET is_uitzendbureau = FALSE, uitzendbureau_naam = NULL 
WHERE is_uitzendbureau IS NULL;
`);

