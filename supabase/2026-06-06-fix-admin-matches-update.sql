-- COMBI SEASON Mundial - corrige permisos admin para actualizar resultados.
-- Ejecutar en Supabase SQL Editor si el admin ve:
-- "Supabase no permitió actualizar este partido. Revisa la policy de update en matches."

-- 1) Asegura que el correo admin tenga rol admin.
update public.players
set role = 'admin'
where lower(email) = 'jaimoro909@hotmail.com';

-- 2) Re-sincroniza auth_user_id por email, incluso si antes quedo con un id viejo.
update public.players as player
set auth_user_id = auth_user.id
from auth.users as auth_user
where lower(player.email) = lower(auth_user.email)
  and (
    player.auth_user_id is null
    or player.auth_user_id is distinct from auth_user.id
  );

-- 3) Funcion central para reconocer admin por id de Auth o por email del JWT.
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

-- 4) Mantiene lectura publica del calendario.
drop policy if exists "Public matches read" on public.matches;

create policy "Public matches read"
on public.matches
for select
to anon, authenticated
using (true);

-- 5) Solo admin autenticado puede actualizar resultados, goleadores y estado.
drop policy if exists "Public matches update" on public.matches;
drop policy if exists "Admins update matches" on public.matches;

create policy "Admins update matches"
on public.matches
for update
to authenticated
using (public.is_combi_admin())
with check (public.is_combi_admin());

-- 6) Verificacion: debe devolver is_admin = true cuando pruebes desde la app logueada.
-- En el SQL Editor puede salir false porque ahi no hay JWT del usuario de la app.
select
  auth.uid() as current_auth_uid,
  auth.jwt() ->> 'email' as current_auth_email,
  public.is_combi_admin() as is_admin;
