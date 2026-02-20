-- ============================================
-- SICK LEAVE ATTACHMENTS STORAGE POLICIES
-- Run dit script in Supabase SQL Editor
-- ============================================
-- 
-- BELANGRIJK: Maak eerst een Storage Bucket aan in Supabase:
-- 1. Ga naar Storage in Supabase Dashboard
-- 2. Klik op "New bucket"
-- 3. Naam: "sick-leave-attachments" (exact deze naam!)
-- 4. Public: Ja (of Nee als je private access wilt)
-- 5. Klik "Create bucket"
-- 
-- Daarna run je dit script om de RLS policies toe te voegen.
-- ============================================

-- INSERT policy: Authenticated users kunnen bestanden uploaden
DROP POLICY IF EXISTS "sick-leave-attachments-insert"
  ON storage.objects;

CREATE POLICY "sick-leave-attachments-insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sick-leave-attachments');

-- SELECT policy: Authenticated users kunnen bestanden bekijken
DROP POLICY IF EXISTS "sick-leave-attachments-select"
  ON storage.objects;

CREATE POLICY "sick-leave-attachments-select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'sick-leave-attachments');

-- DELETE policy: Authenticated users kunnen bestanden verwijderen
DROP POLICY IF EXISTS "sick-leave-attachments-delete"
  ON storage.objects;

CREATE POLICY "sick-leave-attachments-delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'sick-leave-attachments');
