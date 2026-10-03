# D149 · Datos · Publicar un paso exige video completo (ambos roles o líder + seguidor), validado en Postgres · Implementado

**Decisión:** `private.step_videos_complete(step_id)` = hay un video `both`, o uno `leader` y uno
`follower`. Un trigger en `steps` lo exige al publicar (insert publicado o `false → true`,
`MS001`) y otro en `step_videos` impide que un paso publicado se quede sin video completo
(borrar o mover un video). Los pasos ya publicados no se revalidan en otros cambios, y las reglas
solo valen para escrituras de la API (`anon`, `authenticated`, `service_role`): el seed (postgres)
sigue con sus pasos publicados sin video, que el Resumen avisa. La UI muestra los motivos de
`admin_step_issues(step_id)` antes del botón sin repetir la regla.
**Por qué:** decisión de César (2026-10-03) y D003: la regla vive en la base para web, Android e iOS.
**Alternativa descartada:** validar en el cliente o en una Server Action (se salta desde otro
cliente); revalidar todo update de un paso publicado (rompería los pasos del seed).
