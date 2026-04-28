-- Storage bucket + policies for official warning PDFs and ship certificate metadata
-- 1) Create bucket in Supabase Storage UI named: official-warnings (public)
-- 2) Then apply policies below.
--
-- NOTE:
-- De app gebruikt de Supabase ANON key (role = public/anon), niet Supabase auth sessions.
-- Daarom moeten write policies TO public zijn, anders krijg je:
-- "new row violates row-level security policy"

-- Public read for the bucket
CREATE POLICY IF NOT EXISTS "Public read official warnings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'official-warnings');

-- Public write (INSERT) for this bucket
CREATE POLICY IF NOT EXISTS "Public insert official warnings"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'official-warnings');

-- Public write (UPDATE) for upserts/overwrites
CREATE POLICY IF NOT EXISTS "Public update official warnings"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'official-warnings')
  WITH CHECK (bucket_id = 'official-warnings');

-- Public delete from the bucket
CREATE POLICY IF NOT EXISTS "Public delete official warnings"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'official-warnings');

