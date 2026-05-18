-- Layout per schip: eigen formulieren + verborgen standaardformulieren.
-- Draai dit 1x in Supabase SQL editor (na create-ship-forms.sql).

create table if not exists public.ship_form_layout (
  ship_id text primary key,
  custom_forms jsonb not null default '[]'::jsonb,
  removed_form_keys jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.ship_form_layout enable row level security;

drop policy if exists "ship_form_layout_select_authenticated" on public.ship_form_layout;
drop policy if exists "ship_form_layout_insert_authenticated" on public.ship_form_layout;
drop policy if exists "ship_form_layout_update_authenticated" on public.ship_form_layout;
drop policy if exists "ship_form_layout_delete_authenticated" on public.ship_form_layout;

create policy "ship_form_layout_select_authenticated"
  on public.ship_form_layout
  for select
  to authenticated
  using (true);

create policy "ship_form_layout_insert_authenticated"
  on public.ship_form_layout
  for insert
  to authenticated
  with check (true);

create policy "ship_form_layout_update_authenticated"
  on public.ship_form_layout
  for update
  to authenticated
  using (true)
  with check (true);

create policy "ship_form_layout_delete_authenticated"
  on public.ship_form_layout
  for delete
  to authenticated
  using (true);
