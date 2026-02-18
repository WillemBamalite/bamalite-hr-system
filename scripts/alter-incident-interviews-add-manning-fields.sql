-- ============================================
-- ALTER INCIDENT_INTERVIEWS: MANNING VELDEN
-- Run dit script in Supabase SQL Editor
-- ============================================

ALTER TABLE incident_interviews
  ADD COLUMN IF NOT EXISTS rhine_patent TEXT,
  ADD COLUMN IF NOT EXISTS sailing_licence TEXT,
  ADD COLUMN IF NOT EXISTS radar_license TEXT,
  ADD COLUMN IF NOT EXISTS vhf_certificate TEXT,
  ADD COLUMN IF NOT EXISTS adn_basic TEXT,
  ADD COLUMN IF NOT EXISTS adn_c TEXT,
  ADD COLUMN IF NOT EXISTS tank_barge_experience TEXT;

