# D055 · Datos · Seed idempotente: UUID fijos + on conflict (clave) do nothing; estilos, pasos y cursos publicados · Implementado

**Decisión:** `supabase/seed.sql` usa UUID fijos por prefijo (a = estilos/posiciones, b =
pasos, c = canciones, d = curso) y `on conflict (clave) do nothing` con clave explícita, en
una sola transacción. Estilos, pasos y cursos se siembran publicados; canciones no.
**Por qué:** César lo aplicará al proyecto real además de `db reset`; una segunda corrida no
cambia nada ni pisa ediciones hechas en el panel. Con la clave explícita, un estilo con el
mismo `slug` y otro id hace fallar toda la transacción en vez de mezclar catálogos.
`on conflict` sin clave no sirve: `course_units`/`lessons`/`lesson_steps` tienen `unique`
diferibles, que Postgres no acepta como árbitro. Publicado = la app muestra catálogo y curso
sin pasar por el panel.
**Alternativa descartada:** upsert (`do update`) — pisaría las correcciones de César.
Sembrar todo sin publicar — la app se vería vacía hasta revisar fila a fila.
