-- Partidos de ejemplo para probar dashboards de jugadores con Argentina.
-- Ajustar fechas/equipos cuando se cargue el calendario oficial definitivo.

insert into public.matches (match_date, phase, home_team, away_team, status)
values
  ('2026-06-13T22:00:00+00:00', 'Grupo J', 'Argentina', 'Austria', 'open'),
  ('2026-06-18T22:00:00+00:00', 'Grupo J', 'Argentina', 'Argelia', 'open'),
  ('2026-06-24T22:00:00+00:00', 'Grupo J', 'Jordania', 'Argentina', 'open');
