-- Reapertura manual: permite que el admin habilite un partido ya vencido
-- usando matches.status = 'admin_open'.
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
    -- El admin puede recalcular puntos despues del partido sin modificar la prediccion del jugador.
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
    if coalesce(public.is_combi_admin(), false) then
      return old;
    end if;

    select exists (
      select 1
      from public.matches
      where id = old.match_id
        and (
          (status = 'open' and match_date > now())
          or status = 'admin_open'
        )
    )
    into match_is_available;

    if not match_is_available then
      raise exception 'No puedes eliminar predicciones de un partido cerrado.';
    end if;

    return old;
  end if;

  return null;
end;
$$;
