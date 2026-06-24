-- Eén vast salarislijst-wachtwoord per gebruiker (niet per maand).
-- Voer uit in Supabase SQL Editor.

ALTER TABLE public.salary_page_passwords
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
