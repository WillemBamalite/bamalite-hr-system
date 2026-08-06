-- Dedicated note for "Nog in te delen" dashboard cards (separate from profile active_notes)

ALTER TABLE crew
ADD COLUMN IF NOT EXISTS assignment_pool_note TEXT;

COMMENT ON COLUMN crew.assignment_pool_note IS 'Opmerking alleen voor de nog-in-te-delen kaarten op het dashboard';
