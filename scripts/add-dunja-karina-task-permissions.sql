-- ============================================
-- Dunja & Karina in taken + RLS per rol
-- Run in Supabase SQL Editor
-- ============================================

ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_assigned_to_check;

ALTER TABLE tasks
ADD CONSTRAINT tasks_assigned_to_check
CHECK (assigned_to IN ('Nautic', 'Leo', 'Jos', 'Willem', 'Bart', 'Dunja', 'Karina'));

CREATE OR REPLACE FUNCTION public.is_task_manager()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) IN (
    'leo@bamalite.com',
    'willem@bamalite.com',
    'bart@bamalite.com',
    'jos@bamalite.com'
  );
$$;

CREATE OR REPLACE FUNCTION public.task_assignee_for_current_user()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE lower(coalesce(auth.jwt() ->> 'email', ''))
    WHEN 'dunja@bamalite.com' THEN 'Dunja'
    WHEN 'karina@bamalite.com' THEN 'Karina'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_task_office_user()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.task_assignee_for_current_user() IS NOT NULL;
$$;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON tasks;

DROP POLICY IF EXISTS "task_managers_all" ON tasks;
DROP POLICY IF EXISTS "task_office_select_own" ON tasks;
DROP POLICY IF EXISTS "task_office_insert_own" ON tasks;
DROP POLICY IF EXISTS "task_office_update_own" ON tasks;
DROP POLICY IF EXISTS "task_office_delete_own" ON tasks;

CREATE POLICY "task_managers_all" ON tasks
  FOR ALL
  TO authenticated
  USING (public.is_task_manager())
  WITH CHECK (public.is_task_manager());

-- Kantoor: eigen taken + taken die zij aan Dunja/Karina hebben toegewezen
CREATE POLICY "task_office_select_own" ON tasks
  FOR SELECT
  TO authenticated
  USING (
    public.is_task_office_user()
    AND (
      assigned_to = public.task_assignee_for_current_user()
      OR (
        lower(coalesce(created_by, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND assigned_to IN ('Dunja', 'Karina')
      )
    )
  );

-- Kantoor: taken aan Dunja of Karina toewijzen (zichzelf of collega)
CREATE POLICY "task_office_insert_own" ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_task_office_user()
    AND assigned_to IN ('Dunja', 'Karina')
  );

-- Kantoor: alleen taken bewerken die aan henzelf zijn toegewezen
CREATE POLICY "task_office_update_own" ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    public.is_task_office_user()
    AND assigned_to = public.task_assignee_for_current_user()
  )
  WITH CHECK (
    public.is_task_office_user()
    AND assigned_to = public.task_assignee_for_current_user()
  );

CREATE POLICY "task_office_delete_own" ON tasks
  FOR DELETE
  TO authenticated
  USING (
    public.is_task_office_user()
    AND assigned_to = public.task_assignee_for_current_user()
  );

SELECT 'Dunja/Karina task permissions applied' AS result;
