-- Lista oficial del sorteo COMBI SEASON.
-- Ejecutar en Supabase SQL Editor antes de publicar la app.

create table if not exists public.draw_participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  assigned_team text not null unique,
  status text not null default 'pending',
  auth_user_id uuid unique,
  registered_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.draw_participants enable row level security;

drop policy if exists "Public draw participant lookup" on public.draw_participants;
drop policy if exists "Admins read draw participants" on public.draw_participants;
drop policy if exists "Admins manage draw participants" on public.draw_participants;
drop policy if exists "Participant can update own draw row" on public.draw_participants;

create policy "Public draw participant lookup"
on public.draw_participants
for select
to anon, authenticated
using (email is not null);

create policy "Admins manage draw participants"
on public.draw_participants
for all
to authenticated
using (public.is_combi_admin())
with check (public.is_combi_admin());

create policy "Participant can update own draw row"
on public.draw_participants
for update
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'))
with check (lower(email) = lower(auth.jwt() ->> 'email'));

insert into public.draw_participants (name, email, assigned_team)
values
  ('Daniela Morales', 'dmoralesotalvaro@gmail.com', 'Francia'),
  ('Daniela Correa', 'lesslydcorrea@gmail.com', 'Países Bajos'),
  ('Aleja Morales', 'amoralesotalvaro8@gmail.com', 'Uruguay'),
  ('Mariana', 'mh7028802@gmail.com', 'Noruega'),
  ('Guaro', 'sguarin1991@gmail.com', 'Croacia'),
  ('Anderson', 'andersonamariles17991@gmail.com', 'Brasil'),
  ('Daniela Villa', 'villadaniela1995@gmail.com', 'Alemania'),
  ('Emiliano', 'emilianojosevilla12@gmail.com', 'Japón'),
  ('Julian Z', 'julianz.98@hotmail.com', 'Marruecos'),
  ('Cristian Zap', 'cdzt10@gmail.com', 'Suiza'),
  ('Papo', 'jazl940726@gmail.com', 'Ecuador'),
  ('Camilo', 'kmig9507@gmail.com', 'España'),
  ('Diego Tevez', 'diego9305castro@gmail.com', 'Inglaterra'),
  ('Gallego', 'gallegol99@gmail.com', 'Argentina'),
  ('Tavo', 'gonzalezg6107@gmail.com', 'Portugal'),
  ('Jaider', 'jaimoro909@hotmail.com', 'Colombia'),
  ('Fercho', 'luisfgv1104@gmail.com', 'Bélgica'),
  ('Mateo', 'mateuro25@gmail.com', 'Senegal')
on conflict (email) do update set
  name = excluded.name,
  assigned_team = excluded.assigned_team;
