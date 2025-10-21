-- Add checklist system to crew table
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS in_dienst_vanaf DATE,
ADD COLUMN IF NOT EXISTS arbeidsovereenkomst BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ingeschreven_luxembourg BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verzekerd BOOLEAN DEFAULT FALSE;

-- Update existing records to have default values
UPDATE crew 
SET in_dienst_vanaf = NULL,
    arbeidsovereenkomst = FALSE,
    ingeschreven_luxembourg = FALSE,
    verzekerd = FALSE
WHERE in_dienst_vanaf IS NULL 
   OR arbeidsovereenkomst IS NULL 
   OR ingeschreven_luxembourg IS NULL 
   OR verzekerd IS NULL;
