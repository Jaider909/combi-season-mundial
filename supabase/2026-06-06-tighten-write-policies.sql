-- COMBI SEASON Mundial - cierre basico de escrituras para MVP.
-- Mantiene lectura publica para ranking/calendario, pero restringe cambios.

create or replace function public.is_combi_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.players
    where auth_user_id = auth.uid()
      and role = 'admin'
  );
$$;

drop policy if exists "Public registration update" on public.players;
drop policy if exists "Public matches update" on public.matches;
drop policy if exists "Public predictions insert" on public.predictions;
drop policy if exists "Public predictions update" on public.predictions;
drop policy if exists "Public predictions delete" on public.predictions;

create policy "Players update own profile or admin"
on public.players
for update
to authenticated
using (auth_user_id = auth.uid() or public.is_combi_admin())
with check (auth_user_id = auth.uid() or public.is_combi_admin());

create policy "Admins update matches"
on public.matches
for update
to authenticated
using (public.is_combi_admin())
with check (public.is_combi_admin());

create policy "Players insert own predictions"
on public.predictions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.players
    where players.id = predictions.player_id
      and players.auth_user_id = auth.uid()
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
      and players.auth_user_id = auth.uid()
  )
)
with check (
  public.is_combi_admin()
  or exists (
    select 1
    from public.players
    where players.id = predictions.player_id
      and players.auth_user_id = auth.uid()
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
      and players.auth_user_id = auth.uid()
  )
);
