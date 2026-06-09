-- COMBI SEASON Mundial - politicas finales MVP.
-- Ejecutar en Supabase SQL Editor antes de publicar.
-- Objetivo: mantener home/calendario publicos, proteger datos sensibles y
-- limitar escrituras a jugador propio o admin.

create or replace function public.is_combi_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.players
    where (
      auth_user_id = auth.uid()
      or lower(email) = lower(auth.jwt() ->> 'email')
    )
    and role = 'admin'
  );
$$;

grant execute on function public.is_combi_admin() to anon, authenticated;

create or replace view public.player_public_profiles as
select
  id,
  name,
  alias,
  favorite_team,
  payment_status,
  role,
  points,
  created_at
from public.players;

grant select on public.player_public_profiles to anon, authenticated;

alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.draw_participants enable row level security;
alter table public.team_players enable row level security;
alter table public.challenges enable row level security;

drop policy if exists "Public registration insert" on public.players;
drop policy if exists "Public registration read" on public.players;
drop policy if exists "Public registration update" on public.players;
drop policy if exists "Players update own profile or admin" on public.players;
drop policy if exists "Players read own profile or admin" on public.players;
drop policy if exists "Players insert registration" on public.players;
drop policy if exists "Admins delete players" on public.players;

create policy "Players insert registration"
on public.players
for insert
to anon, authenticated
with check (
  role = 'player'
  or lower(email) = 'jaimoro909@hotmail.com'
);

create policy "Players read own profile or admin"
on public.players
for select
to authenticated
using (
  public.is_combi_admin()
  or auth_user_id = auth.uid()
  or lower(email) = lower(auth.jwt() ->> 'email')
);

create policy "Players update own profile or admin"
on public.players
for update
to authenticated
using (
  public.is_combi_admin()
  or auth_user_id = auth.uid()
  or lower(email) = lower(auth.jwt() ->> 'email')
)
with check (
  public.is_combi_admin()
  or auth_user_id = auth.uid()
  or lower(email) = lower(auth.jwt() ->> 'email')
);

create policy "Admins delete players"
on public.players
for delete
to authenticated
using (public.is_combi_admin());

drop policy if exists "Public matches read" on public.matches;
drop policy if exists "Public matches update" on public.matches;
drop policy if exists "Admins update matches" on public.matches;
drop policy if exists "Admins insert matches" on public.matches;
drop policy if exists "Admins delete matches" on public.matches;

create policy "Public matches read"
on public.matches
for select
to anon, authenticated
using (true);

create policy "Admins insert matches"
on public.matches
for insert
to authenticated
with check (public.is_combi_admin());

create policy "Admins update matches"
on public.matches
for update
to authenticated
using (public.is_combi_admin())
with check (public.is_combi_admin());

create policy "Admins delete matches"
on public.matches
for delete
to authenticated
using (public.is_combi_admin());

drop policy if exists "Public predictions insert" on public.predictions;
drop policy if exists "Public predictions read" on public.predictions;
drop policy if exists "Public predictions update" on public.predictions;
drop policy if exists "Public predictions delete" on public.predictions;
drop policy if exists "Players insert own predictions" on public.predictions;
drop policy if exists "Players update own predictions" on public.predictions;
drop policy if exists "Players delete own predictions" on public.predictions;
drop policy if exists "Authenticated predictions read" on public.predictions;

create policy "Authenticated predictions read"
on public.predictions
for select
to authenticated
using (true);

create policy "Players insert own predictions"
on public.predictions
for insert
to authenticated
with check (
  public.is_combi_admin()
  or exists (
    select 1
    from public.players
    where players.id = predictions.player_id
      and (
        players.auth_user_id = auth.uid()
        or lower(players.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

create policy "Players update own predictions"
on public.predictions
for update
to authenticated
using (
  public.is_combi_admin()
  or exists (
    select 1
    from public.players
    where players.id = predictions.player_id
      and (
        players.auth_user_id = auth.uid()
        or lower(players.email) = lower(auth.jwt() ->> 'email')
      )
  )
)
with check (
  public.is_combi_admin()
  or exists (
    select 1
    from public.players
    where players.id = predictions.player_id
      and (
        players.auth_user_id = auth.uid()
        or lower(players.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

create policy "Players delete own predictions"
on public.predictions
for delete
to authenticated
using (
  public.is_combi_admin()
  or exists (
    select 1
    from public.players
    where players.id = predictions.player_id
      and (
        players.auth_user_id = auth.uid()
        or lower(players.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

drop policy if exists "Public draw participant lookup" on public.draw_participants;
drop policy if exists "Admins read draw participants" on public.draw_participants;
drop policy if exists "Admins manage draw participants" on public.draw_participants;
drop policy if exists "Participant can update own draw row" on public.draw_participants;

create policy "Public draw participant lookup"
on public.draw_participants
for select
to anon, authenticated
using (email is not null);

create policy "Admins manage draw participants"
on public.draw_participants
for all
to authenticated
using (public.is_combi_admin())
with check (public.is_combi_admin());

create policy "Participant can update own draw row"
on public.draw_participants
for update
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'))
with check (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Public team players read" on public.team_players;
drop policy if exists "Admins read team players" on public.team_players;
drop policy if exists "Admins insert team players" on public.team_players;
drop policy if exists "Admins update team players" on public.team_players;
drop policy if exists "Admins delete team players" on public.team_players;

create policy "Public team players read"
on public.team_players
for select
to anon, authenticated
using (active = true or public.is_combi_admin());

create policy "Admins insert team players"
on public.team_players
for insert
to authenticated
with check (public.is_combi_admin());

create policy "Admins update team players"
on public.team_players
for update
to authenticated
using (public.is_combi_admin())
with check (public.is_combi_admin());

create policy "Admins delete team players"
on public.team_players
for delete
to authenticated
using (public.is_combi_admin());

drop policy if exists "Challenges read" on public.challenges;
drop policy if exists "Players create challenges" on public.challenges;
drop policy if exists "Players update own challenges" on public.challenges;
drop policy if exists "Admins manage challenges" on public.challenges;
drop policy if exists "Admins delete challenges" on public.challenges;

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
  or challenges.status in ('accepted', 'cancelled')
);

create policy "Admins delete challenges"
on public.challenges
for delete
to authenticated
using (public.is_combi_admin());
