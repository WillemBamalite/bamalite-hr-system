-- Upgrade loon_bemerkingen naar salarisadministratie per maand.
-- Draai dit script in Supabase SQL Editor voordat je de nieuwe Salarissen-pagina gebruikt.

ALTER TABLE public.loon_bemerkingen
  ADD COLUMN IF NOT EXISTS base_salary NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS travel_allowance BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS monthly_adjustment NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Zorg dat er per medewerker per maand maximaal 1 salarisregel is.
CREATE UNIQUE INDEX IF NOT EXISTS ux_loon_bemerkingen_crew_month
  ON public.loon_bemerkingen (crew_id, month_key);

