-- Guarda la ultima modificacion real de una prediccion.
-- La app usa este dato para mostrar si se hizo antes del inicio del partido.

alter table public.predictions
add column if not exists updated_at timestamptz;

update public.predictions
set updated_at = created_at
where updated_at is null;

create or replace function public.touch_prediction_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at = coalesce(new.updated_at, now());
    return new;
  end if;

  if old.predicted_home_score is distinct from new.predicted_home_score
    or old.predicted_away_score is distinct from new.predicted_away_score
    or old.predicted_home_scorer is distinct from new.predicted_home_scorer
    or old.predicted_away_scorer is distinct from new.predicted_away_scorer then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;

  return new;
end;
$$;

drop trigger if exists set_prediction_updated_at on public.predictions;

create trigger set_prediction_updated_at
before insert or update on public.predictions
for each row
execute function public.touch_prediction_updated_at();
