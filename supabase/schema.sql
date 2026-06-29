-- COMBI SEASON Mundial - esquema inicial para Supabase/Postgres.
-- Este archivo todavia no se ejecuta automaticamente. Es la base para crear
-- la BD cuando tengamos el proyecto Supabase y sus credenciales.

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  name text not null,
  alias text not null,
  email text not null unique,
  phone text not null,
  favorite_team text not null,
  payment_status text not null default 'Activo',
  role text not null default 'player',
  points integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  match_number integer unique,
  match_date timestamptz not null,
  phase text not null,
  group_code text,
  home_team text not null,
  away_team text not null,
  home_score integer,
  away_score integer,
  advancing_team text,
  decision_method text,
  status text not null default 'scheduled',
  venue text,
  city text,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_home_score integer not null,
  predicted_away_score integer not null,
  predicted_home_scorer text,
  predicted_away_scorer text,
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  unique (player_id, match_id)
);

alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

drop policy if exists "Public registration insert" on public.players;
drop policy if exists "Public registration read" on public.players;
drop policy if exists "Public registration update" on public.players;
drop policy if exists "Public matches read" on public.matches;
drop policy if exists "Public matches update" on public.matches;
drop policy if exists "Public predictions insert" on public.predictions;
drop policy if exists "Public predictions read" on public.predictions;
drop policy if exists "Public predictions update" on public.predictions;

create policy "Public registration insert"
on public.players
for insert
to anon, authenticated
with check (true);

create policy "Public registration read"
on public.players
for select
to anon, authenticated
using (true);

create policy "Public registration update"
on public.players
for update
to anon, authenticated
using (true)
with check (true);

create policy "Public matches read"
on public.matches
for select
to anon, authenticated
using (true);

create policy "Public matches update"
on public.matches
for update
to anon, authenticated
using (true)
with check (true);

create policy "Public predictions insert"
on public.predictions
for insert
to anon, authenticated
with check (true);

create policy "Public predictions read"
on public.predictions
for select
to anon, authenticated
using (true);

create policy "Public predictions update"
on public.predictions
for update
to anon, authenticated
using (true)
with check (true);

-- Estas politicas son abiertas para poder lanzar el registro publico sin login
-- real. En produccion avanzada conviene limitar admin/lectura con Supabase Auth.
