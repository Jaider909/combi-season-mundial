alter table public.matches
add column if not exists home_scorers text[] not null default '{}',
add column if not exists away_scorers text[] not null default '{}';
