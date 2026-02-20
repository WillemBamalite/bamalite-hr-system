-- ============================================
-- SICK LEAVE BIJLAGEN TABEL SCRIPT
-- Run dit script in Supabase SQL Editor
-- ============================================
-- 
-- BELANGRIJK: Maak eerst een Storage Bucket aan in Supabase:
-- 1. Ga naar Storage in Supabase Dashboard
-- 2. Klik op "New bucket"
-- 3. Naam: "sick-leave-attachments"
-- 4. Public: Ja (of Nee als je private access wilt)
-- 5. Klik "Create bucket"
-- 
-- Als je private access wilt, moet je ook RLS policies toevoegen
-- voor de storage bucket in de Storage policies sectie.
-- ============================================

CREATE TABLE IF NOT EXISTS sick_leave_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Koppeling naar ziekmelding
  sick_leave_id TEXT NOT NULL,

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

ALTER TABLE sick_leave_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users on sick_leave_attachments"
  ON sick_leave_attachments;

CREATE POLICY "Enable all access for authenticated users on sick_leave_attachments"
ON sick_leave_attachments
FOR ALL
USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_sick_leave_attachments_sick_leave_id
  ON sick_leave_attachments(sick_leave_id);

CREATE INDEX IF NOT EXISTS idx_sick_leave_attachments_storage_path
  ON sick_leave_attachments(storage_path);
