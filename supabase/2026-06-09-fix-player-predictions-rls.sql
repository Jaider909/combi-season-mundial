-- Fix definitivo para jugadores que pueden iniciar sesion pero no guardar predicciones.
-- Ejecutar en Supabase SQL Editor con rol postgres.

-- 1) Re-sincroniza cada jugador con su usuario Auth usando el correo.
-- Esto corrige registros que quedaron con auth_user_id nulo o viejo.
update public.players as player
set auth_user_id = auth_user.id
from auth.users as auth_user
where lower(player.email) = lower(auth_user.email)
  and (
    player.auth_user_id is null
    or player.auth_user_id is distinct from auth_user.id
  );

-- 2) Reemplaza policies de predicciones por una version tolerante:
-- el jugador puede escribir si el player_id le pertenece por auth_user_id
-- o, como respaldo, si el email del JWT coincide con el email en players.
drop policy if exists "Public predictions insert" on public.predictions;
drop policy if exists "Public predictions read" on public.predictions;
drop policy if exists "Public predictions update" on public.predictions;
drop policy if exists "Public predictions delete" on public.predictions;
drop policy if exists "Players insert own predictions" on public.predictions;
drop policy if exists "Players update own predictions" on public.predictions;
drop policy if exists "Players delete own predictions" on public.predictions;
drop policy if exists "Authenticated predictions read" on public.predictions;

create policy "Authenticated predictions read"
on public.predictions
for select
to authenticated
using (true);

create policy "Players insert own predictions"
on public.predictions
for insert
to authenticated
with check (
  public.is_combi_admin()
  or exists (
    select 1
    from public.players
    where players.id = predictions.player_id
      and (
        players.auth_user_id = auth.uid()
        or lower(players.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

create policy "Players update own predictions"
on public.predictions
for update
to authenticated
using (
  public.is_combi_admin()
  or exists (
    select 1
    from public.players
    where players.id = predictions.player_id
      and (
        players.auth_user_id = auth.uid()
        or lower(players.email) = lower(auth.jwt() ->> 'email')
      )
  )
)
with check (
  public.is_combi_admin()
  or exists (
    select 1
    from public.players
    where players.id = predictions.player_id
      and (
        players.auth_user_id = auth.uid()
        or lower(players.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

create policy "Players delete own predictions"
on public.predictions
for delete
to authenticated
using (
  public.is_combi_admin()
  or exists (
    select 1
    from public.players
    where players.id = predictions.player_id
      and (
        players.auth_user_id = auth.uid()
        or lower(players.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

-- 3) Verificacion: idealmente debe quedar en 0.
select count(*) as jugadores_sin_auth_vinculado
from public.players
where auth_user_id is null;
