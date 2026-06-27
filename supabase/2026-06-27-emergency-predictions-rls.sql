-- COMBI SEASON - desbloqueo urgente de predicciones.
-- Ejecutar en Supabase SQL Editor.
-- Objetivo: permitir guardar/editar predicciones a jugadores logueados
-- mientras el partido este abierto o reabierto por admin.

grant usage on schema public to anon, authenticated;
grant select on public.players to anon, authenticated;
grant select on public.matches to anon, authenticated;
grant select, insert, update, delete on public.predictions to authenticated;
grant select on public.predictions to anon;

alter table public.predictions enable row level security;

drop policy if exists "Public predictions insert" on public.predictions;
drop policy if exists "Public predictions read" on public.predictions;
drop policy if exists "Public predictions update" on public.predictions;
drop policy if exists "Public predictions delete" on public.predictions;
drop policy if exists "Authenticated predictions read" on public.predictions;
drop policy if exists "Players insert own predictions" on public.predictions;
drop policy if exists "Players update own predictions" on public.predictions;
drop policy if exists "Players delete own predictions" on public.predictions;
drop policy if exists "Emergency predictions read" on public.predictions;
drop policy if exists "Emergency predictions insert" on public.predictions;
drop policy if exists "Emergency predictions update" on public.predictions;
drop policy if exists "Emergency predictions delete" on public.predictions;

create policy "Emergency predictions read"
on public.predictions
for select
to anon, authenticated
using (true);

create policy "Emergency predictions insert"
on public.predictions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.matches
    where matches.id = predictions.match_id
      and matches.status in ('open', 'admin_open')
  )
);

create policy "Emergency predictions update"
on public.predictions
for update
to authenticated
using (true)
with check (
  exists (
    select 1
    from public.matches
    where matches.id = predictions.match_id
      and matches.status in ('open', 'admin_open')
  )
);

create policy "Emergency predictions delete"
on public.predictions
for delete
to authenticated
using (true);

create or replace function public.guard_prediction_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  match_is_available boolean;
begin
  if tg_op = 'UPDATE' then
    if old.player_id is not distinct from new.player_id
      and old.match_id is not distinct from new.match_id
      and old.predicted_home_score is not distinct from new.predicted_home_score
      and old.predicted_away_score is not distinct from new.predicted_away_score
      and old.predicted_home_scorer is not distinct from new.predicted_home_scorer
      and old.predicted_away_scorer is not distinct from new.predicted_away_scorer then
      return new;
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select exists (
      select 1
      from public.matches
      where id = new.match_id
        and (
          (status = 'open' and match_date > now())
          or status = 'admin_open'
        )
    )
    into match_is_available;

    if not match_is_available then
      raise exception 'Las predicciones de este partido ya estan cerradas.';
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists guard_prediction_window_before_write on public.predictions;

create trigger guard_prediction_window_before_write
before insert or update or delete on public.predictions
for each row
execute function public.guard_prediction_window();

select
  'predictions_rls_ok' as status,
  count(*) as predicciones_actuales
from public.predictions;
