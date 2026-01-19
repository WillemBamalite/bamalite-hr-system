-- Add end_date and color fields to agenda_items table
-- This allows agenda items to span multiple days and have visual distinction

-- Add end_date column for multi-day events
ALTER TABLE agenda_items 
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add color column for visual distinction (hex color code)
ALTER TABLE agenda_items 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6'; -- Default blue color

COMMENT ON COLUMN agenda_items.end_date IS 'Einddatum voor agendapunten die meerdere dagen duren. Als dit veld is ingevuld, wordt het item getoond op elke dag tussen date en end_date.';
COMMENT ON COLUMN agenda_items.color IS 'Kleurcode (hex) voor visuele onderscheiding van agendapunten. Standaard is blauw (#3b82f6).';

-- Create index on end_date for faster queries
CREATE INDEX IF NOT EXISTS idx_agenda_items_end_date ON agenda_items(end_date);

