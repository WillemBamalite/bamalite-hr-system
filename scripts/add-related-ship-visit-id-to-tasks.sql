-- ============================================
-- EXTRA KOLOM VOOR SCHEEPSBEZOEK-KOPPELING IN TAKEN
-- Run dit script in Supabase SQL Editor NA het aanmaken van ship_visits
-- ============================================

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS related_ship_visit_id TEXT REFERENCES ship_visits(id) ON DELETE SET NULL;

-- Optionele index voor performance
CREATE INDEX IF NOT EXISTS idx_tasks_related_ship_visit_id ON tasks(related_ship_visit_id);


