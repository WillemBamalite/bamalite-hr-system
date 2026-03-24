-- Status voor personen onder "Nog in te delen" (nieuw personeel / nog in te delen pagina).
-- NULL = beschikbaar voor indeling (groen: nog in te delen)
-- ziek | afwezig = tijdelijk niet inzetbaar (rood)

ALTER TABLE public.crew
ADD COLUMN IF NOT EXISTS pool_availability_status TEXT;

ALTER TABLE public.crew
DROP CONSTRAINT IF EXISTS crew_pool_availability_status_check;

ALTER TABLE public.crew
ADD CONSTRAINT crew_pool_availability_status_check
CHECK (
  pool_availability_status IS NULL
  OR pool_availability_status IN ('ziek', 'afwezig')
);

COMMENT ON COLUMN public.crew.pool_availability_status IS 'Alleen relevant voor pool nog-in-te-delen: ziek of afwezig; NULL = nog in te delen (standaard).';
