-- Plus- of mindagen bij handmatige correcties vaste dienst (vaste_dienst_mindagen).
-- 'minus' = aftrek (standaard, zoals voorheen) | 'plus' = extra dagen toevoegen aan het saldo.

ALTER TABLE public.vaste_dienst_mindagen
ADD COLUMN IF NOT EXISTS adjustment_kind TEXT DEFAULT 'minus';

UPDATE public.vaste_dienst_mindagen
SET adjustment_kind = 'minus'
WHERE adjustment_kind IS NULL;

ALTER TABLE public.vaste_dienst_mindagen
DROP CONSTRAINT IF EXISTS vaste_dienst_mindagen_adjustment_kind_check;

ALTER TABLE public.vaste_dienst_mindagen
ADD CONSTRAINT vaste_dienst_mindagen_adjustment_kind_check
CHECK (adjustment_kind IS NULL OR adjustment_kind IN ('minus', 'plus'));

COMMENT ON COLUMN public.vaste_dienst_mindagen.adjustment_kind IS 'minus = mindagen (aftrek), plus = extra dagen (opslag).';
