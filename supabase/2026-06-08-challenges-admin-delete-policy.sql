-- Permite que el admin limpie retos desde el panel administrativo.
-- Ejecutar en Supabase SQL Editor si el boton "Limpiar retos" no puede borrar.

drop policy if exists "Admins delete challenges" on public.challenges;

create policy "Admins delete challenges"
on public.challenges
for delete
to authenticated
using (public.is_combi_admin());
