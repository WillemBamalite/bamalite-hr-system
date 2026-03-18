-- Official warnings for crew members (tests + manual warnings)
-- Run this in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.official_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id TEXT NOT NULL,
  company TEXT,
  test_date DATE NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('alcohol', 'drugs', 'other')),
  reason_text TEXT,
  performed_by TEXT CHECK (performed_by IN ('W.van der Bent', 'L.Godde', 'BFT')),
  expires_at DATE,
  pdf_nl_url TEXT,
  pdf_de_url TEXT,
  pdf_nl_storage_path TEXT,
  pdf_de_storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_official_warnings_crew_id ON public.official_warnings (crew_id);
CREATE INDEX IF NOT EXISTS idx_official_warnings_test_date ON public.official_warnings (test_date DESC);
CREATE INDEX IF NOT EXISTS idx_official_warnings_expires_at ON public.official_warnings (expires_at DESC);

