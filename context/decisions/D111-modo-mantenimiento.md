# D111 · Datos · Modo mantenimiento con MAINTENANCE_MODE en el proxy: reescritura a /maintenance con 503 y Retry-After · Implementado

**Decisión:** con `MAINTENANCE_MODE=1` (o `true`), `proxy.ts` reescribe toda petición a `/maintenance` con estado
**503** y `Cache-Control: no-store`, antes de tocar la sesión de Supabase. Exentas: `/auth/*` (enlaces de correo
de un solo uso), `/_next/*` y cualquier archivo (último segmento con extensión: manifest, robots, íconos).
`MAINTENANCE_UNTIL` (ISO 8601, opcional) da `Retry-After` en segundos y la fila "Volvemos aproximadamente",
formateada en es-419 en la zona del navegador. Sin el modo, `/maintenance` es 404. Las reglas son puras en
`lib/maintenance.ts`, con tests.
**Por qué:** 503 + `Retry-After` es lo que buscadores y clientes entienden como caída temporal (no desindexan);
reescribir en vez de redirigir conserva la URL para volver a ella. El proxy corre antes que cualquier página.
**Alternativa descartada:** una bandera en la base: exigiría consultar Supabase en cada petición, justo lo que
puede estar caído. En Vercel, cambiar la variable exige un redeploy (o usar Edge Config más adelante).
