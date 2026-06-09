# COMBI SEASON Mundial - Arquitectura

## Estado actual

La app sigue siendo estatica y corre en el navegador. Ya esta preparada para
usar Supabase cuando se configuren las claves publicas del proyecto.

Si `js/config/supabase-config.js` esta vacio, los datos se guardan en
`localStorage` a traves de una capa de repositorio:

- `js/services/storage.js`: lectura/escritura local con respaldo en memoria.
- `js/services/user-repository.js`: operaciones de usuarios actuales e inscritos.
- `js/services/local-user-repository.js`: persistencia local.
- `js/services/supabase-user-repository.js`: persistencia en Supabase.

Esto permite cambiar la persistencia sin reescribir dashboard, admin o formularios.

## Modulos frontend

- `js/app.js`: arranque de la app y eventos principales.
- `js/countdown.js`: contador al inicio del Mundial.
- `js/config/teams.js`: lista de selecciones.
- `js/config/groups.js`: grupos y clasificacion inicial.
- `js/config/supabase-config.js`: URL y anon key publica de Supabase.
- `js/ui/dashboard.js`: render del panel del jugador.
- `js/ui/admin.js`: render del panel administrativo.
- `js/ui/teams.js`: carga del selector de equipos.
- `js/ui/dom.js`: helpers de DOM y seguridad para HTML.

## Base de datos recomendada

La ruta recomendada es Supabase:

- Plan Free para iniciar.
- Postgres como base de datos.
- Supabase Auth para registro/login real.
- API REST generada automaticamente sobre las tablas.
- Opcion de subir a plan pago cuando crezca el uso.

## Tablas iniciales

El borrador esta en `supabase/schema.sql`:

- `players`: usuarios/participantes.
- `matches`: partidos.
- `predictions`: predicciones por usuario y partido, incluyendo marcador y goleadores.

## Siguiente paso tecnico

Ejecutar `supabase/schema.sql` en Supabase y pegar `Project URL` + `anon public key` en `js/config/supabase-config.js`.
