# D152 · Producto · Un paso se borra solo si es borrador y ninguna lección lo usa; publicado, solo despublicar · Implementado

**Decisión:** trigger `before delete` en `steps`: publicado → `MS004`; con fila en
`lesson_steps` → `MS005`. El borrado en cascada de un estilo (profundidad de trigger > 1) no pasa
por aquí. La UI solo ofrece "Borrar" en borradores sin lecciones (con AlertDialog) y, después de
borrar la fila, borra sus videos y su clip de Storage. Despublicar uno que usan lecciones pide
confirmación nombrando cuántas.
**Por qué:** `lesson_steps` tiene `on delete cascade`: sin la regla, borrar un paso lo sacaría en
silencio de las lecciones; el historial de repasos también se perdería.
**Alternativa descartada:** borrado lógico (`archived_at`): una columna y filtros más en todas las
lecturas para un caso raro del admin.
