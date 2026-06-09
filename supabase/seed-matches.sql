-- Seed inicial de partidos para probar el flujo real.
-- Estos datos son ejemplos de trabajo; reemplazar por calendario oficial final.

insert into public.matches (match_date, phase, home_team, away_team, status)
values
  ('2026-06-11T19:00:00+00:00', 'Grupo A', 'México', 'Sudáfrica', 'open'),
  ('2026-06-12T22:00:00+00:00', 'Grupo K', 'Portugal', 'Colombia', 'open'),
  ('2026-06-17T22:00:00+00:00', 'Grupo K', 'Colombia', 'Uzbekistán', 'open'),
  ('2026-06-23T22:00:00+00:00', 'Grupo K', 'Colombia', 'Congo DR', 'open')
on conflict do nothing;
