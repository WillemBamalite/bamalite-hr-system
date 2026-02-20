-- ============================================
-- ADD EXPIRY EMAIL SENT FIELD TO SICK_LEAVE
-- Run dit script in Supabase SQL Editor
-- ============================================

ALTER TABLE sick_leave
ADD COLUMN IF NOT EXISTS expiry_email_sent_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN sick_leave.expiry_email_sent_at IS 'Timestamp wanneer de e-mail voor verlopen ziektebriefje is verstuurd (3 dagen van tevoren)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sick_leave_expiry_email_sent_at
  ON sick_leave(expiry_email_sent_at);
