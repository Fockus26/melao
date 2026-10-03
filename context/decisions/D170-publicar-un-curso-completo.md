# D170 · Producto · Publicar un curso exige lecciones, cada una con pasos y con alguna canción · Implementado

**Decisión:** `private.course_issues(course)` devuelve en orden `no_lessons`,
`lesson_without_steps`, `lesson_without_song`; publicar (insert publicado o false → true) con
alguno → `MS025`. No revalida un curso ya publicado en otros cambios (como Pasos, D149): lo que
falta después lo avisa el Resumen (`missing_song`, `step_unpublished`, `song_unavailable`). Pasos o
canciones sin publicar y los avisos de secuencia del core (D173) no bloquean. La UI muestra los
motivos en texto antes del botón Publicar y pide confirmación para despublicar.
**Por qué:** un curso sin lecciones, una lección sin pasos o sin canción no se pueden completar (la
lección solo se completa con la práctica final, D098). Lo demás puede publicarse después.
**Alternativa descartada:** bloquear también por pasos o canciones sin publicar: obliga a publicar
en un orden fijo y dejaría el curso a medias si una licencia vence.
