-- Per-gebruiker "laatst gelezen" voor statusupdates op taken (JSONB: email lowercase -> ISO timestamp)
-- Run in Supabase SQL editor. Vereist voor meldingen over meerdere apparaten.

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS status_reads jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN tasks.status_reads IS
  'Map viewer email (lowercase) -> max status_updates.at ISO string they have acknowledged; syncs across devices';

CREATE INDEX IF NOT EXISTS idx_tasks_status_reads ON tasks USING gin (status_reads);
