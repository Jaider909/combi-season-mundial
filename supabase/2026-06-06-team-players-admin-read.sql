-- COMBI SEASON Mundial - permite al admin ver jugadores inactivos.
-- Ejecutar despues de 2026-06-06-team-players-phase-1.sql.

drop policy if exists "Admins read team players" on public.team_players;

create policy "Admins read team players"
on public.team_players
for select
to authenticated
using (public.is_combi_admin());
