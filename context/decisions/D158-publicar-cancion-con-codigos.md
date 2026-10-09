# D158 · Datos · Publicar una canción exige audio, rejilla, fin de baile, estilo y licencia vigente; los motivos son códigos de Postgres · Implementado

**Decisión:** `private.song_issues(song)` da los motivos en orden fijo (`missing_audio`,
`missing_grid`, `missing_dance_end`, `missing_style`, `missing_license_source`,
`missing_license_document`, `license_expired`); `admin_song_issues(id)` los expone y el trigger
`songs_check_publish` corta publicar con `MS201` (detail = los códigos). Una publicada no pierde
audio, licencia, rejilla ni su último estilo (`MS202`); lo que ya estaba publicado no se revalida.
El check `songs_publish_requirements` se queda. La UI traduce los códigos; la rejilla y el fin de
baile dicen "márcala en el analizador de ritmo (llega pronto)" hasta la ola C.
**Por qué:** el check daba un error genérico (23514) y la UI tendría que repetir la regla para
explicar el bloqueo; Android/iOS leerían la misma función.
**Alternativa descartada:** permitir publicar con licencia vencida (el alumno igual no la ve):
dejaría publicada una canción que nadie ve y el Resumen la avisaría al momento.
