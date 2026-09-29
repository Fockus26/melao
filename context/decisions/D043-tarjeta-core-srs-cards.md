# D043 · Arquitectura · Tarjeta del core = fila de srs_cards (snake_case, ISO); reviewCard da también la fila de step_reviews · Implementado

**Decisión:** `SrsCard` = `Pick<Tables<"srs_cards">, state | stability | difficulty | due_at |
last_review_at | reps | lapses>`: snake_case y fechas ISO 8601, sin claves ni `created_at`.
`reviewCard` devuelve además `{ rating, reviewed_at, due_after }` para `step_reviews`.
**Por qué:** la Edge Function escribe el resultado tal cual (sin capa de mapeo que pueda
desalinearse), el tipo sale del esquema generado (el test de deriva lo protege) y los
vectores JSON usan los mismos nombres que la base.
**Alternativa descartada:** camelCase con `Date` en el core y mapeo en la Edge Function.
**Estado (detalle):** Implementado (07a)
