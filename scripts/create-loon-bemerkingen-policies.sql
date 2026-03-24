-- RLS policies voor loon_bemerkingen
-- Run in Supabase SQL editor.

ALTER TABLE public.loon_bemerkingen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loon_bemerkingen_select_auth"
ON public.loon_bemerkingen
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "loon_bemerkingen_insert_auth"
ON public.loon_bemerkingen
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "loon_bemerkingen_update_auth"
ON public.loon_bemerkingen
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "loon_bemerkingen_delete_auth"
ON public.loon_bemerkingen
FOR DELETE
TO authenticated
USING (true);

