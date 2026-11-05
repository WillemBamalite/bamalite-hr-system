-- Open plekken op de overwerkersplanning (schip, periode, functie).

CREATE TABLE IF NOT EXISTS overwerk_open_plekken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  position TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE overwerk_open_plekken IS 'Nog in te delen overwerk: schip, periode en functie';

ALTER TABLE overwerk_open_plekken ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "overwerk_open_plekken_public_all" ON overwerk_open_plekken;
CREATE POLICY "overwerk_open_plekken_public_all"
  ON overwerk_open_plekken
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
