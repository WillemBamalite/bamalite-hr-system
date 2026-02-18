-- ============================================
-- INCIDENT BIJLAGEN TABEL SCRIPT
-- Run dit script in Supabase SQL Editor
-- ============================================
-- 
-- BELANGRIJK: Maak eerst een Storage Bucket aan in Supabase:
-- 1. Ga naar Storage in Supabase Dashboard
-- 2. Klik op "New bucket"
-- 3. Naam: "incident-attachments"
-- 4. Public: Ja (of Nee als je private access wilt)
-- 5. Klik "Create bucket"
-- 
-- Als je private access wilt, moet je ook RLS policies toevoegen
-- voor de storage bucket in de Storage policies sectie.
-- ============================================

CREATE TABLE IF NOT EXISTS incident_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Koppeling naar incidentrapport
  report_id UUID REFERENCES incident_reports(id) ON DELETE CASCADE,

  -- Type bijlage
  attachment_type TEXT NOT NULL CHECK (
    attachment_type IN ('foto', 'video', 'pdf', 'email', 'ais', 'logboek', 'verklaring', 'ander')
  ),

  -- Bestandsgegevens
  file_name TEXT NOT NULL,
  -- Pad binnen de Supabase Storage bucket (handig voor verwijderen)
  storage_path TEXT,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,

  -- Metadata
  description TEXT,
  attachment_date DATE,

  -- Optionele koppelingen aan andere onderdelen
  linked_to_timeline_event_id UUID REFERENCES incident_timeline_events(id) ON DELETE SET NULL,
  linked_to_fact_id UUID REFERENCES incident_facts(id) ON DELETE SET NULL,
  linked_to_interview_id UUID REFERENCES incident_interviews(id) ON DELETE SET NULL,
  linked_to_action_id UUID REFERENCES incident_actions(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE incident_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users on incident_attachments"
  ON incident_attachments;

CREATE POLICY "Enable all access for authenticated users on incident_attachments"
ON incident_attachments
FOR ALL
USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_incident_attachments_report_id
  ON incident_attachments(report_id);

CREATE INDEX IF NOT EXISTS idx_incident_attachments_type
  ON incident_attachments(attachment_type);

CREATE INDEX IF NOT EXISTS idx_incident_attachments_storage_path
  ON incident_attachments(storage_path);
