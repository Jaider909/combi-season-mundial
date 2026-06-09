-- COMBI SEASON Mundial - campos de calendario FIFA para partidos.
-- Ejecutar una vez antes de cargar supabase/seed-fifa-2026-group-stage.sql.

alter table public.matches
add column if not exists match_number integer,
add column if not exists group_code text,
add column if not exists venue text,
add column if not exists city text,
add column if not exists source text;

drop index if exists matches_match_number_key;

create unique index matches_match_number_key
on public.matches (match_number);
