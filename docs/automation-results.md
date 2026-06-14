# Automatizacion de resultados COMBI SEASON

Este flujo deja la operacion en modo hibrido: el admin puede guardar resultados manualmente, pero una tarea automatica revisa partidos vencidos y puede sincronizar marcadores desde una API deportiva.

## Que hace

- Cierra automaticamente partidos `open` que ya pasaron de hora, cambiandolos a `locked`.
- Si hay API deportiva configurada, revisa resultados finalizados.
- Si encuentra marcador y goleadores, marca el partido como `finished`.
- Recalcula puntos de todas las predicciones de ese partido.
- Si la API no entrega goleadores en un partido con goles, no reparte puntos incompletos y deja el partido para revision manual.

## Variables en Vercel

En Vercel, proyecto `combi-season-mundial`, agrega:

| Variable | Uso |
| --- | --- |
| `SUPABASE_URL` | URL del proyecto Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave privada de servicio de Supabase. No va en frontend. |
| `CRON_SECRET` | Texto secreto inventado para proteger `/api/sync-results`. |
| `APISPORTS_KEY` | Llave de API-Football / API-Sports. |
| `APISPORTS_LEAGUE_ID` | ID de la competencia si lo tienes. Recomendado para no traer partidos ajenos. |
| `APISPORTS_SEASON` | `2026`. |
| `APISPORTS_TIMEZONE` | `America/Bogota`. |

## Activacion en Supabase

Primero ejecuta la metadata visual de revision:

`supabase/2026-06-14-result-review-metadata.sql`

Esto permite que el admin muestre:

- `Manual / Revisado`
- `Automático / Pendiente revisión`
- Boton `Marcar resultado revisado` en el detalle del partido.

Luego programa el cron:

Ejecuta en Supabase SQL Editor:

`supabase/2026-06-14-schedule-result-sync.sql`

Antes de correrlo, reemplaza `CAMBIA_ESTE_SECRETO` por el valor real de `CRON_SECRET`.

## Prueba manual

Despues de desplegar en Vercel, abre:

```text
https://combiseason.com/api/sync-results?secret=TU_CRON_SECRET
```

Debe responder JSON con:

- `ok: true`
- `locked`: partidos que cerro por hora.
- `resultSync.updated`: partidos finalizados que pudo actualizar.
- `resultSync.skipped`: partidos que necesitan revision o no aparecieron en la API.

## Regla importante

La automatizacion no reemplaza al admin. El admin sigue siendo la autoridad final para corregir marcador, goleadores, autogoles, dobletes y tripletes.

Si el admin guarda el resultado antes que el job automatico, el partido queda `finished` y la automatizacion ya no lo vuelve a tocar.
