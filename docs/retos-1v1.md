# Modulo Retos 1 vs 1

Este modulo queda separado de la polla principal. No modifica predicciones,
ranking, grupos, puntos ni pagos actuales.

## Objetivo

Permitir que dos jugadores creen un reto sobre un partido especifico. Cada uno
elige una seleccion diferente del mismo partido y la app registra el ganador
cuando el admin cierre el resultado.

## Regla base

Ejemplo: Colombia vs Portugal.

- Jugador A elige Colombia.
- Jugador B elige Portugal.
- Valor acordado: 20.000 por jugador.
- Bolsa visible: 40.000.

Resultado:

- Si gana Colombia, gana Jugador A.
- Si gana Portugal, gana Jugador B.
- Si empatan, el reto queda en estado `draw` y se marca como empate para la app.

Distribucion visible:

- Si hay ganador: ganador 90%, app 10%.
- Si hay empate: app 100%.

## Importante

La version 1 no conecta pagos, billetera, saldo ni pasarela. El valor del reto
queda como referencia social entre jugadores.

Si en el futuro la app retiene comision, maneja dinero o se queda con saldos en
empates, se debe revisar la parte legal antes de publicarlo.

## Estados

- `open`: reto creado y esperando rival.
- `accepted`: reto aceptado por otro jugador.
- `closed`: reto liquidado por resultado del partido.
- `cancelled`: reto cancelado antes de ser aceptado.
- `draw`: el partido empato y no hay ganador directo.

## Flujo recomendado

1. Jugador crea reto desde un partido.
2. Escoge uno de los dos equipos del partido.
3. Define valor acordado.
4. Otro jugador acepta el lado contrario.
5. Cuando el admin guarda resultado, el sistema detecta ganador.
6. El reto muestra ganador, perdedor o empate.

## Reglas para no mezclar con la polla

- No suma puntos del ranking principal.
- No modifica predicciones normales.
- No reemplaza el modulo de goleadores.
- No bloquea que un jugador haga su prediccion normal del mismo partido.
- No aparece en home publica hasta que se decida activarlo.

## Datos minimos

- partido
- creador
- rival
- equipo del creador
- equipo del rival
- valor acordado
- estado
- ganador
- fecha de creacion
- fecha de aceptacion
- fecha de cierre

## SQL

Para activar el modulo en Supabase, ejecutar:

`supabase/2026-06-07-challenges.sql`

## Pendientes de producto

- Definir si los retos son visibles para todos o privados.
- Definir si cualquier jugador puede aceptar o si se invita a una persona.
- Definir regla final de empate.
- Revisar parte legal si se quiere manejar dinero real.
