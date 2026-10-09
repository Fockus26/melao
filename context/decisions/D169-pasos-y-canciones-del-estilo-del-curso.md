# D169 · Producto · Pasos y canciones de una lección, del estilo del curso; la lección no cambia de curso · Implementado

**Decisión:** triggers de `20261003170000_admin_course.sql`: un `lesson_steps` con paso de otro
estilo → `MS021`; `practice_song_id` o `final_song_id` sin ese estilo en `song_styles` → `MS022`
(solo la canción que cambia, para que una que perdió el estilo después no bloquee otros
cambios); mover una lección a una unidad de otro curso → `MS024`. Valen para la API; el seed y
las migraciones quedan fuera. El selector de canciones ofrece las del estilo y marca las que el
alumno no puede usar ("sin publicar", "licencia vencida", "sin este estilo").
**Por qué:** `plan-session` exige que la canción sea del estilo y la lección de un curso del estilo
(404 si no); mejor que el admin no pueda guardar una lección que el alumno no podría practicar.
**Alternativa descartada:** validarlo solo en el editor: Android e iOS tendrían que repetirlo (D003).
