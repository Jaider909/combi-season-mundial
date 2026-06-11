-- Traspaso oficial: Melissa no participa y Papo queda con Ecuador.
-- Ejecutar en Supabase SQL Editor.

begin;

-- Libera Ecuador del sorteo.
delete from public.draw_participants
where lower(email) = 'dmelissag2609@gmail.com';

-- Papo queda asignado a Ecuador en el sorteo oficial.
insert into public.draw_participants (name, email, assigned_team)
values ('Papo', 'jazl940726@gmail.com', 'Ecuador')
on conflict (email) do update set
  name = excluded.name,
  assigned_team = excluded.assigned_team;

-- Si Papo ya se registro, su dashboard debe moverse a Ecuador.
update public.players
set favorite_team = 'Ecuador'
where lower(email) = 'jazl940726@gmail.com';

commit;

select name, email, assigned_team, status
from public.draw_participants
where lower(email) in ('jazl940726@gmail.com', 'dmelissag2609@gmail.com')
   or assigned_team in ('Ecuador', 'Turquía')
order by assigned_team, name;

select name, alias, email, favorite_team, points
from public.players
where lower(email) in ('jazl940726@gmail.com', 'dmelissag2609@gmail.com')
order by email;
