-- COMBI SEASON Mundial - clasificado en eliminatorias.
-- Permite guardar marcador empatado y definir quien avanza por tiempo extra o penales.
-- Ejecutar en Supabase SQL Editor.

alter table public.matches
  add column if not exists advancing_team text,
  add column if not exists decision_method text;

-- Normaliza partidos de eliminacion ya finalizados sin empate:
-- si hubo ganador en marcador, ese equipo queda como clasificado por 90 minutos.
update public.matches
set
  advancing_team = case
    when home_score > away_score then home_team
    when away_score > home_score then away_team
    else advancing_team
  end,
  decision_method = case
    when home_score is not null
      and away_score is not null
      and home_score <> away_score
      and decision_method is null
    then '90_minutos'
    else decision_method
  end
where match_number >= 73
  and status = 'finished'
  and home_score is not null
  and away_score is not null;

select
  match_number,
  home_team,
  away_team,
  home_score,
  away_score,
  advancing_team,
  decision_method,
  status
from public.matches
where match_number >= 73
order by match_number;

