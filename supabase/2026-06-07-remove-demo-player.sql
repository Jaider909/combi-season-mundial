-- Limpieza de usuario demo.
-- Ejecutar en Supabase SQL Editor para quitar el registro de prueba del panel admin.

delete from public.predictions
where player_id in (
  select id
  from public.players
  where lower(email) = 'pruebacriptochat@gmail.com'
);

delete from public.players
where lower(email) = 'pruebacriptochat@gmail.com';

-- Verificacion: debe devolver 0 filas.
select id, name, email, favorite_team
from public.players
where lower(email) = 'pruebacriptochat@gmail.com';
