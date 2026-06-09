-- Modulo Retos 1 vs 1.
-- Ejecutar en Supabase SQL Editor para activar la tabla de retos.

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  creator_player_id uuid not null references public.players(id) on delete cascade,
  opponent_player_id uuid references public.players(id) on delete set null,
  creator_team text not null,
  opponent_team text,
  stake_amount integer not null default 0,
  status text not null default 'open',
  winner_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  closed_at timestamptz,
  constraint challenges_status_check check (
    status in ('open', 'accepted', 'closed', 'cancelled', 'draw')
  ),
  constraint challenges_positive_stake check (stake_amount >= 0)
);

alter table public.challenges enable row level security;

drop policy if exists "Challenges read" on public.challenges;
drop policy if exists "Players create challenges" on public.challenges;
drop policy if exists "Players update own challenges" on public.challenges;
drop policy if exists "Admins manage challenges" on public.challenges;

create policy "Challenges read"
on public.challenges
for select
to authenticated
using (true);

create policy "Players create challenges"
on public.challenges
for insert
to authenticated
with check (
  exists (
    select 1
    from public.players
    where players.id = challenges.creator_player_id
      and (
        players.auth_user_id = auth.uid()
        or lower(players.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

create policy "Players update own challenges"
on public.challenges
for update
to authenticated
using (
  public.is_combi_admin()
  or exists (
    select 1
    from public.players
    where players.id in (challenges.creator_player_id, challenges.opponent_player_id)
      and (
        players.auth_user_id = auth.uid()
        or lower(players.email) = lower(auth.jwt() ->> 'email')
      )
  )
  or (
    challenges.status = 'open'
    and challenges.opponent_player_id is null
  )
)
with check (
  public.is_combi_admin()
  or exists (
    select 1
    from public.players
    where players.id in (challenges.creator_player_id, challenges.opponent_player_id)
      and (
        players.auth_user_id = auth.uid()
        or lower(players.email) = lower(auth.jwt() ->> 'email')
      )
  )
  or (
    challenges.status in ('accepted', 'cancelled')
  )
);
