-- COMBI SEASON Mundial - normaliza planteles oficiales activos.
-- Ejecutar en Supabase SQL Editor.
-- No toca usuarios, predicciones, partidos ni puntos.
-- Solo deja activos los jugadores del import oficial FIFA 2026 para las 48 selecciones.

with official_players(team, name) as (
  select team, name
  from public.team_players
  where source = 'FIFA World Cup 2026 official squad list v1'
)
update public.team_players as existing
set active = false
where existing.team in (select distinct team from official_players)
  and not exists (
    select 1
    from official_players official
    where official.team = existing.team
      and official.name = existing.name
  );

select team, count(*) as active_players
from public.team_players
where active = true
group by team
order by team;
