-- Limpieza de retos de prueba.
-- Ejecutar en Supabase SQL Editor para dejar el modulo Retos en cero.
-- No toca usuarios, partidos, predicciones ni resultados.

delete from public.challenges;

-- Verificacion: debe devolver 0.
select count(*) as remaining_challenges
from public.challenges;
