-- Extra beveiliging per gebruiker per maand voor Salarissen-pagina.
-- Voer uit in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.salary_page_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  month_key TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT salary_page_passwords_user_month_unique UNIQUE (user_id, month_key)
);

CREATE INDEX IF NOT EXISTS salary_page_passwords_month_idx
  ON public.salary_page_passwords (month_key);

CREATE INDEX IF NOT EXISTS salary_page_passwords_email_month_idx
  ON public.salary_page_passwords (user_email, month_key);
