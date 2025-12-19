-- ============================================
-- UPDATE SHIP_VISITS: Vervang crew_present door ploeg
-- Run dit script in Supabase SQL Editor
-- ============================================

-- Add ploeg column
ALTER TABLE ship_visits
ADD COLUMN IF NOT EXISTS ploeg TEXT CHECK (ploeg IN ('A', 'B'));

-- Migrate existing data: als er crew_present is, probeer ploeg te bepalen
-- (Dit is optioneel - je kunt ook gewoon de nieuwe kolom gebruiken)
-- UPDATE ship_visits SET ploeg = 'A' WHERE array_length(crew_present, 1) > 0;

-- Optioneel: verwijder oude crew_present kolom (als je zeker weet dat je hem niet meer nodig hebt)
-- ALTER TABLE ship_visits DROP COLUMN IF EXISTS crew_present;

-- Add comment
COMMENT ON COLUMN ship_visits.ploeg IS 'Ploeg die aan boord was tijdens het bezoek: A of B';

-- ============================================
-- SUCCESS!
-- ============================================
SELECT 'Ship visits table updated successfully! 🎉' as result;

