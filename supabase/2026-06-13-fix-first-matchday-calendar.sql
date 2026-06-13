-- Ajuste COMBI SEASON: corregir fechas visibles de la primera jornada.
-- Referencia operativa: Flashscore Campeonato del Mundo 2026, seccion Partidos.
-- Horarios guardados en UTC para que la app los muestre en la zona horaria del jugador.
--
-- Impacto esperado en Colombia:
-- Partido 8  Qatar vs Suiza        -> 13 jun, 02:00 p.m.
-- Partido 6  Australia vs Turquia  -> 13 jun, 11:00 p.m.
-- Partido 12 Suecia vs Tunez       -> 14 jun, 09:00 p.m.
-- Partido 16 Belgica vs Egipto     -> 15 jun, 02:00 p.m.

update public.matches
set match_date = case match_number
  when 8 then '2026-06-13T19:00:00+00:00'::timestamptz
  when 6 then '2026-06-14T04:00:00+00:00'::timestamptz
  when 12 then '2026-06-15T02:00:00+00:00'::timestamptz
  when 16 then '2026-06-15T19:00:00+00:00'::timestamptz
  else match_date
end
where match_number in (6, 8, 12, 16);

select
  match_number,
  home_team,
  away_team,
  match_date,
  match_date at time zone 'America/Bogota' as hora_colombia
from public.matches
where match_number in (6, 8, 12, 16)
order by match_number;
