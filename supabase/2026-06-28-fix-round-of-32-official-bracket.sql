-- COMBI SEASON Mundial - correccion completa de dieciseisavos segun cuadro confirmado.
-- Ejecutar en Supabase SQL Editor.
-- No borra predicciones, puntos ni resultados. Solo corrige equipos 73-88.

with official_round_of_32(match_number, home_team, away_team) as (
  values
    (73, 'Sudáfrica', 'Canadá'),
    (74, 'Alemania', 'Paraguay'),
    (75, 'Países Bajos', 'Marruecos'),
    (76, 'Brasil', 'Japón'),
    (77, 'Francia', 'Suecia'),
    (78, 'Costa de Marfil', 'Noruega'),
    (79, 'México', 'Ecuador'),
    (80, 'Inglaterra', 'Congo DR'),
    (81, 'Estados Unidos', 'Bosnia y Herzegovina'),
    (82, 'Bélgica', 'Corea del Sur'),
    (83, 'Portugal', 'Croacia'),
    (84, 'España', 'Austria'),
    (85, 'Suiza', 'Argelia'),
    (86, 'Argentina', 'Cabo Verde'),
    (87, 'Colombia', 'Ghana'),
    (88, 'Australia', 'Egipto')
)
update public.matches as match
set
  home_team = official.home_team,
  away_team = official.away_team,
  status = case
    when match.status = 'finished' then match.status
    when official.home_team is null or official.away_team is null then 'locked'
    when match.status = 'locked' then 'open'
    else match.status
  end
from official_round_of_32 as official
where match.match_number = official.match_number;

select
  match_number,
  match_date,
  phase,
  home_team,
  away_team,
  status,
  home_score,
  away_score
from public.matches
where match_number between 73 and 88
order by match_number;

