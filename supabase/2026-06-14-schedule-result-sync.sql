-- Programa la automatizacion de COMBI SEASON.
-- 1) En Vercel configura primero:
--    SUPABASE_URL
--    SUPABASE_SERVICE_ROLE_KEY
--    CRON_SECRET
--    APISPORTS_KEY                  -- opcional para resultados automaticos
--    APISPORTS_LEAGUE_ID            -- opcional, recomendado cuando tengas el ID correcto
--    APISPORTS_SEASON=2026
--    APISPORTS_TIMEZONE=America/Bogota
--
-- 2) Reemplaza CAMBIA_ESTE_SECRETO por el mismo CRON_SECRET de Vercel.
-- 3) Ejecuta todo este archivo en Supabase SQL Editor.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

select cron.unschedule('combi-season-sync-results')
where exists (
  select 1
  from cron.job
  where jobname = 'combi-season-sync-results'
);

select cron.schedule(
  'combi-season-sync-results',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://combiseason.com/api/sync-results?secret=CAMBIA_ESTE_SECRETO'
  ) as request_id;
  $$
);

-- Verifica que quedo programado.
select jobid, jobname, schedule, active
from cron.job
where jobname = 'combi-season-sync-results';
