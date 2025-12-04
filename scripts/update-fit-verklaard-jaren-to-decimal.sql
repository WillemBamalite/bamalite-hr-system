-- Update fit_verklaard_jaren column to support decimal values (0.5 for 6 months)
-- This allows storing 6 months as 0.5 years in addition to whole years (3, 2, 1)

-- First, check if column exists and what type it is
-- If it's INTEGER, we need to change it to NUMERIC/DECIMAL

-- Try to alter the column type to NUMERIC (supports both integers and decimals)
DO $$ 
BEGIN
  -- Check if column exists and is INTEGER type
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'crew' 
    AND column_name = 'fit_verklaard_jaren'
    AND data_type = 'integer'
  ) THEN
    -- Alter to NUMERIC to support decimals
    ALTER TABLE crew 
    ALTER COLUMN fit_verklaard_jaren TYPE NUMERIC(3,1);
    
    RAISE NOTICE 'Column fit_verklaard_jaren changed from INTEGER to NUMERIC(3,1)';
  ELSIF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'crew' 
    AND column_name = 'fit_verklaard_jaren'
  ) THEN
    RAISE NOTICE 'Column fit_verklaard_jaren already exists with type: %', (
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'crew' 
      AND column_name = 'fit_verklaard_jaren'
    );
  ELSE
    -- Column doesn't exist, create it as NUMERIC
    ALTER TABLE crew 
    ADD COLUMN IF NOT EXISTS fit_verklaard_jaren NUMERIC(3,1) DEFAULT NULL;
    
    RAISE NOTICE 'Column fit_verklaard_jaren created as NUMERIC(3,1)';
  END IF;
END $$;

-- Update comment
COMMENT ON COLUMN crew.fit_verklaard_jaren IS 'Validity period in years (3, 2, 1) or 0.5 for 6 months';

