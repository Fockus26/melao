# D155 · Producto · Avisos = algo mal en lo publicado; Pendientes = borradores con lo que les falta · Implementado

**Decisión:** **Avisos**: paso publicado sin video completo (`both`, o `leader` y `follower`;
misma regla que publicar), canción publicada con licencia vencida o que vence en ≤ 30 días,
lección de un curso visible que usa un paso sin publicar, una canción no visible (sin publicar
o licencia vencida) o ninguna canción. **Pendientes**: paso sin publicar (con `missing_video` o
sin motivos = listo para publicar), canción sin publicar con lo que exige
`songs_publish_requirements` (audio, rejilla ≥ 2 anclas, fin de baile, licencia), estilo sin
publicar (posición inicial si falta). "Lecciones publicadas" = las de un curso publicado de un
estilo publicado; "Alumnos" = `app_role = 'student'`, con suscripción `active` y período sin
vencer aparte.
**Por qué:** César pidió "contadores y avisos" (spec: canciones sin licencia, pasos sin video).
Separar lo que ya ve el alumno de lo que aún no se publica ordena qué arreglar primero; 30 días
da margen para renovar una licencia antes de que la canción desaparezca (D009).
**Alternativa descartada:** una sola lista con severidades (mezcla urgencias con trabajo
pendiente); avisar de lecciones sin pasos o canciones sin estilo (no son requisitos de
publicación hoy; se agregan como código nuevo si César los quiere).
