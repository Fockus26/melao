# phases/

Una fase por archivo. Cada fase se ejecuta completa antes de pasar a la siguiente, y se
compone de **unidades de trabajo** — cada unidad es una rama, una pausa de aprobación y un
commit.

## El set completo

| # | Fase | Quién la ejecuta |
|---|---|---|
| 01 | Tokens | `frontend-build` |
| 02 | Layout base | `frontend-build` |
| 03 | Componentes | `frontend-build` |
| 04 | Secciones | `frontend-build` |
| 05 | Páginas | `frontend-build` |
| 06 | Estados | `frontend-build` |
| 07 | Backend | `backend-build` |
| 08 | Responsive y pulido | `frontend-build` |
| 09 | QA final | `design-qa` + `functional-qa` |

## Tracks

El orquestador elige uno en el arranque y lo deja escrito en `PROJECT_CONTEXT.md`.

| Track | Fases | Cuándo |
|---|---|---|
| **Landing** | 01 · 02 · 03 · 04 · 06 · 08 · 09 | Una sola página. Se salta 05 (la página se arma en 04) y 07 salvo que haya formulario con envío real. |
| **Sitio** | 01 - 06 · 08 · 09 | Corporativo o multi-página sin backend pesado. |
| **Producto** | 01 - 09 | E-commerce, SaaS, dashboard: todo lo que tenga auth, pagos o datos de usuario. |

Elegir de más es tan malo como elegir de menos: una fase vacía es ceremonia sin trabajo real.

## Regla común a todas

- Cada fase se cierra actualizando `context/`: el inventario que toque, `decisions/`,
  `DECISIONS_INDEX.md`, `CONTENT_CHECKLIST.md`, `PHASE_LOG/0N-<fase>.md` y `CURRENT_PHASE.md`.
- Ninguna fase se cierra con la puerta `a11y` en rojo.
- Si algo es ambiguo: exactamente 3 opciones, con ventaja y desventaja real, y se espera.
- Si falta un dato del handoff: se pregunta, **no se estima del mockup**.
