-- COMBI SEASON Mundial - fallback admin por email autenticado.
-- Usalo si el admin no puede guardar resultados despues de cerrar policies.

update public.players
set role = 'admin'
where lower(email) = 'jaimoro909@hotmail.com';

update public.players as player
set auth_user_id = auth_user.id
from auth.users as auth_user
where lower(player.email) = lower(auth_user.email)
  and player.auth_user_id is null;

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

drop policy if exists "Admins update matches" on public.matches;

create policy "Admins update matches"
on public.matches
for update
to authenticated
using (public.is_combi_admin())
with check (public.is_combi_admin());
