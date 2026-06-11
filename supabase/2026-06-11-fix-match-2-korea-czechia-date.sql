-- Corrige Partido 2: Corea del Sur vs Republica Checa.
-- FIFA: 12 Jun 2026 02:00 UTC = 11 Jun 2026 09:00 p.m. Colombia.

update public.matches
set
  match_date = '2026-06-12T02:00:00+00:00',
  updated_at = now()
where match_number = 2
  and home_team = 'Corea del Sur'
  and away_team = 'República Checa';

select
  match_number,
  match_date,
  home_team,
  away_team,
  status
from public.matches
where match_number = 2;
