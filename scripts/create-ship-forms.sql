-- Scheepsformulieren: datum + bestand per schip per formulier.
-- Draai dit 1x in Supabase SQL editor.

create table if not exists public.ship_forms (
  id uuid primary key default gen_random_uuid(),
  ship_id text not null,
  form_key text not null,
  form_date date,
  file_name text,
  file_path text,
  uploaded_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint ship_forms_ship_form_unique unique (ship_id, form_key)
);

create index if not exists idx_ship_forms_ship_id on public.ship_forms (ship_id);

alter table public.ship_forms enable row level security;

drop policy if exists "ship_forms_select_authenticated" on public.ship_forms;
drop policy if exists "ship_forms_insert_authenticated" on public.ship_forms;
drop policy if exists "ship_forms_update_authenticated" on public.ship_forms;
drop policy if exists "ship_forms_delete_authenticated" on public.ship_forms;

create policy "ship_forms_select_authenticated"
  on public.ship_forms
  for select
  to authenticated
  using (true);

create policy "ship_forms_insert_authenticated"
  on public.ship_forms
  for insert
  to authenticated
  with check (true);

create policy "ship_forms_update_authenticated"
  on public.ship_forms
  for update
  to authenticated
  using (true)
  with check (true);

create policy "ship_forms_delete_authenticated"
  on public.ship_forms
  for delete
  to authenticated
  using (true);
