-- Corrige Partido 19: Argentina vs Argelia.
-- Hora oficial: 2026-06-17 01:00 UTC = 2026-06-16 08:00 p.m. Colombia.

update public.matches
set match_date = '2026-06-17T01:00:00+00:00'
where match_number = 19
  and home_team = 'Argentina'
  and away_team = 'Argelia';

select
  match_number,
  match_date,
  match_date at time zone 'America/Bogota' as hora_colombia,
  home_team,
  away_team,
  status
from public.matches
where match_number = 19;
