-- COMBI SEASON Mundial - permite que el admin tambien juegue como jugador.
-- Corrige bloqueos RLS al guardar predicciones con cuenta admin.

update public.players as player
set auth_user_id = auth_user.id
from auth.users as auth_user
where lower(player.email) = lower(auth_user.email)
  and player.auth_user_id is null;

update public.players
set role = 'admin'
where lower(email) = 'jaimoro909@hotmail.com';

drop policy if exists "Players insert own predictions" on public.predictions;
drop policy if exists "Players update own predictions" on public.predictions;
drop policy if exists "Players delete own predictions" on public.predictions;

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
