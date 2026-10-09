# D165 · Producto · Publicar un estilo exige solo la posición inicial; el catálogo es un aviso · Implementado

**Decisión:** `admin_style_issues(p_style_id)` devuelve `missing_start_position` o `{}`; un
trigger da `ME008` al publicar (o quitar la posición inicial de uno publicado) sin ella, antes del
`check` `dance_styles_published_needs_start`. La validación del catálogo (`validateCatalog` del
core, con todos los pasos y con solo los publicados) se muestra en la pantalla en texto, sin
bloquear.
**Por qué:** es la misma regla que ya usa el Resumen (Pendientes: `missing_start_position` o
"listo para publicar", D155); bloquear por el catálogo exigiría reimplementar `validateCatalog`
en SQL (el core es TS) y dejaría al Resumen diciendo "listo" para algo que no se puede publicar.
**Alternativa descartada:** exigir catálogo válido o al menos un paso publicado: más seguro para
el alumno, pero duplica la lógica del core en Postgres; queda como posible regla futura vía Edge
Function.
