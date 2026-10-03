# D150 · Técnica · Subidas del admin: 50 MB y tipos fijos en el bucket y en el cliente; nombre de objeto nuevo en cada subida · Implementado

**Decisión:** `storage.buckets.file_size_limit` = 50 MB y `allowed_mime_types` fijos por bucket
(`step-videos` mp4/webm · `songs` y `voice-clips` mp3/m4a/wav · `song-licenses` pdf/jpg/png), los
mismos de `lib/admin/storage.ts`, que valida antes de subir y manda el tipo canónico de la
extensión. Objetos: `step-videos/<step_id>/<rol>-<marca>.<ext>` y
`voice-clips/steps/<step_id>-<marca>.<ext>`, con marca de tiempo en base 36. Secuencia: subir →
apuntar la fila → borrar el anterior; si la fila falla, se borra lo subido. Sube el cliente del
navegador por RLS (admin); vista previa con URL firmada de 5 min. Sin barra de progreso: el SDK
no la da, se muestra "Subiendo…".
**Por qué:** un nombre nuevo evita servir el archivo viejo desde caché sin depender de `upsert`
ni de cabeceras; con el `step_id` en la ruta, renombrar el slug no rompe nada.
**Alternativa descartada:** ruta fija `<slug>/<rol>.mp4` con `upsert` (caché vieja y rutas rotas
al cambiar el slug); subida resumible TUS para ver progreso (más dependencias; con 50 MB basta).
