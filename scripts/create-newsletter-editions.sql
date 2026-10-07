-- Maandelijkse nieuwsbrief, één rij per editie (bijv. 2026-10).
-- Personeelslijsten staan hier niet in; die blijven live uit de bemanning komen.

CREATE TABLE IF NOT EXISTS public.newsletter_editions (
  id TEXT PRIMARY KEY,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

COMMENT ON TABLE public.newsletter_editions IS 'Redactionele inhoud van Bamalite Scheepsnieuws per maand';

ALTER TABLE public.newsletter_editions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_editions_public_all" ON public.newsletter_editions;
CREATE POLICY "newsletter_editions_public_all"
  ON public.newsletter_editions
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
