-- Storage bucket + policies for official warning PDFs
-- 1) Create bucket in Supabase Storage UI named: official-warnings (public)
-- 2) Then apply policies below if needed.

-- Public read for the bucket
CREATE POLICY IF NOT EXISTS "Public read official warnings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'official-warnings');

-- Authenticated users can upload to the bucket
CREATE POLICY IF NOT EXISTS "Authenticated upload official warnings"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'official-warnings');

-- Authenticated users can delete from the bucket
CREATE POLICY IF NOT EXISTS "Authenticated delete official warnings"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'official-warnings');

