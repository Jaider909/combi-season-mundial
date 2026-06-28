-- COMBI SEASON - permite al admin recalcular puntos en predicciones cerradas.
-- Ejecutar en Supabase SQL Editor cuando al guardar resultado aparezca:
-- "new row violates row-level security policy for table predictions"

update public.players
set role = 'admin'
where lower(email) = 'jaimoro909@hotmail.com';

update public.players as player
set auth_user_id = auth_user.id
from auth.users as auth_user
where lower(player.email) = lower(auth_user.email)
  and (
    player.auth_user_id is null
    or player.auth_user_id is distinct from auth_user.id
  );

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
    where role = 'admin'
      and (
        auth_user_id = auth.uid()
        or lower(email) = lower(auth.jwt() ->> 'email')
      )
  );
$$;

grant execute on function public.is_combi_admin() to anon, authenticated;
grant select, insert, update, delete on public.predictions to authenticated;

drop policy if exists "Emergency predictions update" on public.predictions;

create policy "Emergency predictions update"
on public.predictions
for update
to authenticated
using (
  public.is_combi_admin()
  or exists (
    select 1
    from public.matches
    where matches.id = predictions.match_id
      and matches.status in ('open', 'admin_open')
  )
)
with check (
  public.is_combi_admin()
  or exists (
    select 1
    from public.matches
    where matches.id = predictions.match_id
      and matches.status in ('open', 'admin_open')
  )
);

select
  'admin_prediction_points_update_policy_ok' as status,
  public.is_combi_admin() as is_admin_from_sql_editor_may_be_false;
