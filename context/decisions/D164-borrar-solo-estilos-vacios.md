# D164 · Producto · Un estilo se borra solo sin publicar y vacío (sin pasos, canciones ni curso) · Implementado

**Decisión:** trigger `before delete` en `dance_styles` (escrituras de la API): publicado →
`ME004`; con pasos, filas en `song_styles` o curso → `ME005`. Sus posiciones se van en cascada.
Publicado → solo despublicar (con confirmación). La UI solo ofrece "Borrar estilo" cuando se
cumple, con AlertDialog. El seed y las migraciones (postgres) no pasan por la regla.
**Por qué:** decisión de César (2026-10-03). Como un estilo borrable no tiene pasos, la cascada
nunca llega a `steps_check_delete` ni a `step_videos_keep_complete` (comprobado en
`tests/unit/db-admin-styles.test.ts`).
**Alternativa descartada:** borrado en cascada con confirmación fuerte: se llevaría pasos, videos,
canciones asociadas y el curso, y el historial de práctica (`practice_sessions.style_id` sin
cascade) lo impediría de todos modos.
