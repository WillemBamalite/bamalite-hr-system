-- Add uitzendbureau fields to crew table
ALTER TABLE crew 
ADD COLUMN is_uitzendbureau BOOLEAN DEFAULT FALSE,
ADD COLUMN uitzendbureau_naam TEXT;

-- Update existing records to have default values
UPDATE crew 
SET is_uitzendbureau = FALSE, uitzendbureau_naam = NULL 
WHERE is_uitzendbureau IS NULL;

