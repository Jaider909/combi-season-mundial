-- Traspaso oficial: Cristian Zap cambia de Suiza a Turquia.
-- Mantiene usuario, puntos y predicciones. Solo cambia seleccion asignada/favorita.

begin;

-- Asegura el traspaso anterior: Melissa no participa y Papo queda con Ecuador.
delete from public.draw_participants
where lower(email) = 'dmelissag2609@gmail.com';

insert into public.draw_participants (name, email, assigned_team)
values ('Papo', 'jazl940726@gmail.com', 'Ecuador')
on conflict (email) do update set
  name = excluded.name,
  assigned_team = excluded.assigned_team;

update public.players
set favorite_team = 'Ecuador'
where lower(email) = 'jazl940726@gmail.com';

insert into public.draw_participants (name, email, assigned_team)
values ('Cristian Zap', 'cdzt10@gmail.com', 'Turquía')
on conflict (email) do update set
  name = excluded.name,
  assigned_team = excluded.assigned_team;

update public.players
set favorite_team = 'Turquía'
where lower(email) = 'cdzt10@gmail.com';

commit;

select name, email, assigned_team, status
from public.draw_participants
where lower(email) in ('cdzt10@gmail.com', 'jazl940726@gmail.com', 'dmelissag2609@gmail.com')
   or assigned_team in ('Suiza', 'Turquía', 'Ecuador')
order by assigned_team, name;

select name, alias, email, favorite_team, points
from public.players
where lower(email) in ('cdzt10@gmail.com', 'jazl940726@gmail.com', 'dmelissag2609@gmail.com')
order by email;
