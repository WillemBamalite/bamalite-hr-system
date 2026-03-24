-- Functie-label op kaarten van zelfstandige aflossers (overzicht aflossers).
-- NULL = nog niet gekozen (eerste klik zet kapitein via de app-cyclus)

ALTER TABLE public.crew
ADD COLUMN IF NOT EXISTS aflosser_pool_functie TEXT;

ALTER TABLE public.crew
DROP CONSTRAINT IF EXISTS crew_aflosser_pool_functie_check;

ALTER TABLE public.crew
ADD CONSTRAINT crew_aflosser_pool_functie_check
CHECK (
  aflosser_pool_functie IS NULL
  OR aflosser_pool_functie IN ('kapitein', 'stuurman', 'matroos')
);

COMMENT ON COLUMN public.crew.aflosser_pool_functie IS
'Pool-label zelfstandige aflosser: kapitein, stuurman of matroos; NULL = open.';
