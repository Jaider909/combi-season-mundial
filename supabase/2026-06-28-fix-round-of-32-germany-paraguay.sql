-- COMBI SEASON Mundial - ajuste puntual de dieciseisavos.
-- Partido 74 confirmado: Alemania vs Paraguay.
-- Ejecutar en Supabase SQL Editor.

update public.matches
set
  home_team = 'Alemania',
  away_team = 'Paraguay',
  status = case
    when status in ('finished', 'closed') then status
    else 'open'
  end
where match_number = 74;

-- Verificacion rapida del partido corregido.
select
  match_number,
  match_date,
  phase,
  home_team,
  away_team,
  status
from public.matches
where match_number = 74;

-- Revision de todos los dieciseisavos para detectar placeholders pendientes.
select
  match_number,
  match_date,
  home_team,
  away_team,
  status,
  home_score,
  away_score
from public.matches
where match_number between 73 and 88
order by match_number;
