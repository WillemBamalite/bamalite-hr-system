-- Wisselende maandbedragen voor automatische lening-aflossing.
-- Voer uit in Supabase SQL Editor als deze kolommen nog ontbreken.

ALTER TABLE loans ADD COLUMN IF NOT EXISTS installment_amount_mode TEXT NOT NULL DEFAULT 'fixed';
ALTER TABLE loans ADD COLUMN IF NOT EXISTS installment_schedule JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN loans.installment_amount_mode IS 'fixed = één bedrag per periode; schedule = per maand een eigen bedrag in installment_schedule.';
COMMENT ON COLUMN loans.installment_schedule IS 'Lijst van {period: YYYY-MM, amount: number} voor wisselende maandbedragen.';
