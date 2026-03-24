-- Loon bemerkingen per maand (zonder salarisbedragen)
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.loon_bemerkingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id TEXT NOT NULL,
  company TEXT,
  month_key TEXT NOT NULL, -- formaat: YYYY-MM
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loon_bemerkingen_month_key
  ON public.loon_bemerkingen (month_key);

CREATE INDEX IF NOT EXISTS idx_loon_bemerkingen_company
  ON public.loon_bemerkingen (company);

CREATE INDEX IF NOT EXISTS idx_loon_bemerkingen_crew_id
  ON public.loon_bemerkingen (crew_id);

