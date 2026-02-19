-- ============================================
-- TASK BIJLAGEN TABEL SCRIPT
-- Run dit script in Supabase SQL Editor
-- ============================================
--
-- BELANGRIJK: Maak eerst een Storage Bucket aan in Supabase:
-- 1. Ga naar Storage in Supabase Dashboard
-- 2. Klik op "New bucket"
-- 3. Naam: "task-attachments"
-- 4. Public: Ja (of Nee als je private access wilt)
-- 5. Klik "Create bucket"
--
-- Als je private access wilt, moet je ook RLS policies toevoegen
-- voor de storage bucket in de Storage policies sectie.
-- ============================================

CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Koppeling naar taak
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,

  -- Bestandsgegevens
  file_name TEXT NOT NULL,
  -- Pad binnen de Supabase Storage bucket (handig voor verwijderen)
  storage_path TEXT,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,

  -- Optionele beschrijving
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users on task_attachments"
  ON task_attachments;

CREATE POLICY "Enable all access for authenticated users on task_attachments"
ON task_attachments
FOR ALL
USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id
  ON task_attachments(task_id);

CREATE INDEX IF NOT EXISTS idx_task_attachments_storage_path
  ON task_attachments(storage_path);

