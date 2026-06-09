-- Permite que el panel admin de esta version de prueba actualice resultados.
-- En produccion conviene restringir esta policy solo a usuarios admin.

drop policy if exists "Public matches update" on public.matches;

create policy "Public matches update"
on public.matches
for update
to anon, authenticated
using (true)
with check (true);
