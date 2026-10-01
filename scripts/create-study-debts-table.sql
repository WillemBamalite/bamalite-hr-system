-- Studies die Bamalite heeft betaald nadat iemand geslaagd is.
-- Elk vol jaar in dienst na paid_on vervalt €500 (berekend in de app, niet als boeking).
-- Voer uit in de Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS study_debts (
    id TEXT PRIMARY KEY,
    crew_id TEXT NOT NULL REFERENCES crew(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    paid_on DATE NOT NULL,
    notes TEXT,
    settled_at TIMESTAMP WITH TIME ZONE,
    settled_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE study_debts IS 'Door Bamalite betaalde studies. Openstaand bedrag vervalt met €500 per vol jaar in dienst na paid_on.';
COMMENT ON COLUMN study_debts.paid_on IS 'Datum waarop Bamalite de studie heeft betaald. Vanaf deze datum telt in dienst na betaling.';
COMMENT ON COLUMN study_debts.settled_at IS 'Gezet wanneer het restbedrag met het laatste salaris is verrekend.';
COMMENT ON COLUMN study_debts.settled_amount IS 'Bedrag dat bij verrekenen nog openstond.';

ALTER TABLE study_debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON study_debts;
CREATE POLICY "Enable all access for authenticated users" ON study_debts
  FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_study_debts_crew_id ON study_debts(crew_id);
CREATE INDEX IF NOT EXISTS idx_study_debts_paid_on ON study_debts(paid_on);

CREATE OR REPLACE FUNCTION update_study_debts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_study_debts_updated_at_trigger ON study_debts;
CREATE TRIGGER update_study_debts_updated_at_trigger
    BEFORE UPDATE ON study_debts
    FOR EACH ROW
    EXECUTE FUNCTION update_study_debts_updated_at();
