-- Gedeelde certificatenstatus per schip voor alle gebruikers.
-- Draai dit 1x in Supabase SQL editor.

create table if not exists public.ship_certificate_states (
  ship_key text primary key,
  ship_name text not null,
  certificates jsonb not null default '[]'::jsonb,
  removed_certificate_keys jsonb not null default '[]'::jsonb,
  documents jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.ship_certificate_states enable row level security;

drop policy if exists "Enable read access for authenticated users" on public.ship_certificate_states;
drop policy if exists "Enable insert access for authenticated users" on public.ship_certificate_states;
drop policy if exists "Enable update access for authenticated users" on public.ship_certificate_states;
drop policy if exists "Enable delete access for authenticated users" on public.ship_certificate_states;

create policy "Enable read access for authenticated users"
  on public.ship_certificate_states
  for select
  to authenticated
  using (true);

create policy "Enable insert access for authenticated users"
  on public.ship_certificate_states
  for insert
  to authenticated
  with check (true);

create policy "Enable update access for authenticated users"
  on public.ship_certificate_states
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Enable delete access for authenticated users"
  on public.ship_certificate_states
  for delete
  to authenticated
  using (true);
