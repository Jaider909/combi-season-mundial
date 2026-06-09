-- COMBI SEASON Mundial - jugadores destacados fase 1.
-- Tabla editable para alimentar los datalist de goleadores.
-- Esta fase carga jugadores destacados, no necesariamente la lista completa de 26.

create table if not exists public.team_players (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  name text not null,
  position text,
  shirt_number integer,
  club text,
  is_featured boolean not null default true,
  active boolean not null default true,
  source text,
  created_at timestamptz not null default now(),
  unique (team, name)
);

alter table public.team_players enable row level security;

drop policy if exists "Public team players read" on public.team_players;
drop policy if exists "Admins insert team players" on public.team_players;
drop policy if exists "Admins update team players" on public.team_players;
drop policy if exists "Admins delete team players" on public.team_players;

create policy "Public team players read"
on public.team_players
for select
to anon, authenticated
using (active = true);

create policy "Admins insert team players"
on public.team_players
for insert
to authenticated
with check (public.is_combi_admin());

create policy "Admins update team players"
on public.team_players
for update
to authenticated
using (public.is_combi_admin())
with check (public.is_combi_admin());

create policy "Admins delete team players"
on public.team_players
for delete
to authenticated
using (public.is_combi_admin());

insert into public.team_players
  (team, name, position, is_featured, active, source)
values
  ('Colombia', 'Luis Díaz', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Colombia', 'James Rodríguez', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Colombia', 'Jhon Arias', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Colombia', 'Jhon Córdoba', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Colombia', 'Rafael Santos Borré', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Colombia', 'Daniel Muñoz', 'Defensor', true, true, 'COMBI phase 1 destacados'),
  ('Argentina', 'Lionel Messi', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Argentina', 'Lautaro Martínez', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Argentina', 'Julián Álvarez', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Argentina', 'Ángel Di María', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Argentina', 'Enzo Fernández', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Argentina', 'Alexis Mac Allister', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Brasil', 'Vinícius Júnior', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Brasil', 'Rodrygo', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Brasil', 'Raphinha', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Brasil', 'Endrick', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Brasil', 'Neymar', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Brasil', 'Lucas Paquetá', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Portugal', 'Cristiano Ronaldo', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Portugal', 'Bruno Fernandes', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Portugal', 'Bernardo Silva', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Portugal', 'Rafael Leão', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Portugal', 'Gonçalo Ramos', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Portugal', 'João Félix', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('España', 'Álvaro Morata', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('España', 'Lamine Yamal', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('España', 'Nico Williams', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('España', 'Dani Olmo', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('España', 'Pedri', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('España', 'Ferran Torres', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Francia', 'Kylian Mbappé', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Francia', 'Antoine Griezmann', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Francia', 'Ousmane Dembélé', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Francia', 'Marcus Thuram', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Francia', 'Olivier Giroud', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Francia', 'Kingsley Coman', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Inglaterra', 'Harry Kane', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Inglaterra', 'Jude Bellingham', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Inglaterra', 'Bukayo Saka', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Inglaterra', 'Phil Foden', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Inglaterra', 'Cole Palmer', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Inglaterra', 'Marcus Rashford', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Alemania', 'Kai Havertz', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Alemania', 'Jamal Musiala', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Alemania', 'Florian Wirtz', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Alemania', 'Niclas Füllkrug', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Alemania', 'Leroy Sané', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Alemania', 'Serge Gnabry', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('México', 'Santiago Giménez', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('México', 'Hirving Lozano', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('México', 'Julián Quiñones', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('México', 'Uriel Antuna', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('México', 'Edson Álvarez', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('México', 'Orbelín Pineda', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Uruguay', 'Darwin Núñez', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Uruguay', 'Federico Valverde', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Uruguay', 'Luis Suárez', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Uruguay', 'Facundo Pellistri', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Uruguay', 'Rodrigo Bentancur', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Uruguay', 'Giorgian De Arrascaeta', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Países Bajos', 'Memphis Depay', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Países Bajos', 'Cody Gakpo', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Países Bajos', 'Xavi Simons', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Países Bajos', 'Donyell Malen', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Países Bajos', 'Wout Weghorst', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Países Bajos', 'Frenkie de Jong', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Bélgica', 'Romelu Lukaku', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Bélgica', 'Kevin De Bruyne', 'Mediocampista', true, true, 'COMBI phase 1 destacados'),
  ('Bélgica', 'Jérémy Doku', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Bélgica', 'Leandro Trossard', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Bélgica', 'Loïs Openda', 'Delantero', true, true, 'COMBI phase 1 destacados'),
  ('Bélgica', 'Youri Tielemans', 'Mediocampista', true, true, 'COMBI phase 1 destacados')
on conflict (team, name) do update set
  position = excluded.position,
  is_featured = excluded.is_featured,
  active = excluded.active,
  source = excluded.source;
