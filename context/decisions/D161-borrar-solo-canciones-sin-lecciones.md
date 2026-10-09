# D161 · Producto · Una canción se borra solo si es borrador y ninguna lección la usa; publicada, solo despublicar · Implementado

**Decisión:** trigger `before delete` en `songs`: publicada → `MS203`; práctica o final de alguna
lección → `MS204`. La UI ofrece "Borrar" solo en borradores sin lecciones (con AlertDialog) y,
después de borrar la fila, borra su audio y el documento de la licencia de Storage. Despublicar
una que usan lecciones pide confirmación diciendo cuántas.
**Por qué:** `lessons.practice_song_id`/`final_song_id` son `on delete set null`: sin la regla, la
lección se quedaría sin canción en silencio. Mismo criterio que los pasos (D152).
**Alternativa descartada:** borrado lógico: columna y filtros más para un caso raro.
