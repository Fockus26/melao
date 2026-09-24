# Current Phase — {{NOMBRE_DEL_PROYECTO}}

> **Tablero, no diario.** Se lee en *cada* sesión, así que cabe en una pantalla:
> **≤ 60 líneas / 4 KB**. Solo lo abierto, lo que bloquea y lo que sigue.
> Al cerrar una unidad, su narrativa (qué se hizo, qué se verificó y qué no, hallazgos)
> va a `PHASE_LOG/<rama>.md` y aquí queda, como mucho, una línea con el enlace.
> Comprobación al cerrar: `wc -c context/CURRENT_PHASE.md` → si pasa de 4000, podar.

## Ahora

**Fase:** {{0N — Nombre}} · **Track:** {{Landing | Sitio | Producto}}

| Unidad | Rama | Estado | Log |
|---|---|---|---|
| {{Hero}} | `{{design/hero}}` | {{abierta · PR #N en revisión · mergeada}} | `PHASE_LOG/{{design-hero}}.md` |

## Bloquea (acciones de César o externas)

- {{ej. "correr supabase/x.sql antes de desplegar el PR #N"}}

## Sigue

- {{la próxima unidad o decisión}}

## Fases

| # | Fase | Estado |
|---|---|---|
| 01 | Tokens | {{pendiente}} |
| 02 | Layout base | {{pendiente}} |
| 03 | Componentes | {{pendiente}} |
| 04 | Secciones | {{pendiente}} |
| 05 | Páginas | {{pendiente / N/A}} |
| 06 | Estados | {{pendiente}} |
| 07 | Backend | {{pendiente / N/A}} |
| 08 | Responsive y pulido | {{pendiente}} |
| 09 | QA final | {{pendiente}} |

<!-- Pendientes sueltos que no son de la unidad en curso: context/plans/pendientes.md
     (uno por bloque, con qué/por qué/versión), no aquí. -->
