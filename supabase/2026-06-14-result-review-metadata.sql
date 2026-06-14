-- Metadata para saber si un resultado fue cargado manualmente o por automatizacion.
-- Ejecutar en Supabase SQL Editor antes de activar la sincronizacion automatica.

alter table public.matches
add column if not exists result_source text,
add column if not exists result_review_status text not null default 'pending',
add column if not exists result_synced_at timestamptz;

update public.matches
set
  result_source = coalesce(result_source, 'manual'),
  result_review_status = case
    when result_review_status = 'pending' then 'reviewed'
    else result_review_status
  end
where status = 'finished';

select
  match_number,
  home_team,
  away_team,
  status,
  result_source,
  result_review_status,
  result_synced_at
from public.matches
where status = 'finished'
order by match_number
limit 20;
