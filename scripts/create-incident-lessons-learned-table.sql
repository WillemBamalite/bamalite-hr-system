-- ============================================
-- INCIDENT LESSONS LEARNED TABEL SCRIPT
-- Run dit script in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS incident_lessons_learned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Koppeling naar incidentrapport
  report_id UUID REFERENCES incident_reports(id) ON DELETE CASCADE,

  -- Categorie: operationeel, technisch, organisatorisch
  category TEXT NOT NULL CHECK (
    category IN ('operationeel', 'technisch', 'organisatorisch')
  ),

  -- De les zelf
  lesson TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE incident_lessons_learned ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users on incident_lessons_learned"
  ON incident_lessons_learned;

CREATE POLICY "Enable all access for authenticated users on incident_lessons_learned"
ON incident_lessons_learned
FOR ALL
USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_incident_lessons_learned_report_id
  ON incident_lessons_learned(report_id);

CREATE INDEX IF NOT EXISTS idx_incident_lessons_learned_category
  ON incident_lessons_learned(category);
