-- Permite que el administrador cambie horarios, cierre/reabra predicciones
-- y guarde resultados desde COMBI SEASON.
drop policy if exists "Combi admins update matches" on public.matches;

create policy "Combi admins update matches"
on public.matches
for update
to authenticated
using (coalesce(public.is_combi_admin(), false))
with check (coalesce(public.is_combi_admin(), false));
