-- Optionele automatische maandregeling voor openstaande leningen
-- Voer uit in Supabase SQL Editor als deze kolommen nog ontbreken.

ALTER TABLE loans ADD COLUMN IF NOT EXISTS auto_installment_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS monthly_installment_amount DECIMAL(10,2);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS installment_start_period TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS last_installment_period TEXT;

COMMENT ON COLUMN loans.auto_installment_enabled IS 'Als true: bij bezoek leningen-pagina worden openstaande maanden automatisch geboekt.';
COMMENT ON COLUMN loans.monthly_installment_amount IS 'Bedrag per kalendermaand.';
COMMENT ON COLUMN loans.installment_start_period IS 'Eerste maand (YYYY-MM) waarvoor de regeling geldt.';
COMMENT ON COLUMN loans.last_installment_period IS 'Laatste maand (YYYY-MM) waarvoor automatisch een termijn is geboekt.';

ALTER TABLE loans ADD COLUMN IF NOT EXISTS installment_period_type TEXT NOT NULL DEFAULT 'month';
COMMENT ON COLUMN loans.installment_period_type IS 'month = elke kalendermaand; year = één keer per jaar op dezelfde maand (YYYY-MM in start).';
COMMENT ON COLUMN loans.monthly_installment_amount IS 'Bedrag per periode (maand of jaar, zie installment_period_type).';
