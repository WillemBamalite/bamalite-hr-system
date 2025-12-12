-- Add voor_wie (for whom) field to agenda_items table
-- This field specifies who the agenda item is for

ALTER TABLE agenda_items 
ADD COLUMN IF NOT EXISTS voor_wie TEXT;

COMMENT ON COLUMN agenda_items.voor_wie IS 'Voor wie is dit agenda item (bijv. Willem, Leo, Jos, Bart, Nautic, of algemeen)';

