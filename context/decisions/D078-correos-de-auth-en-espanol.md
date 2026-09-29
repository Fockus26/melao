# D078 · Contenido · Correos de auth en español versionados en supabase/templates; en el real se pegan a mano · Implementado

**Decisión:** las plantillas de "Confirmar correo" y "Restablecer contraseña" viven en
`supabase/templates/confirmation.html` y `recovery.html` (asunto en `supabase/config.toml`), en
español, con el enlace `{{ .ConfirmationURL }}` (flujo PKCE: Supabase verifica y manda a
`/auth/callback` con el código). Colores copiados en línea de `design/tokens.json` (color.light),
porque los clientes de correo no leen variables CSS; es la única excepción a "tokens por
variable". El proyecto real no lee estos archivos: César pega asunto y HTML en Supabase › Auth ›
Emails cada vez que cambien.
**Por qué:** los correos por defecto están en inglés; versionarlos evita que la copia del
dashboard sea la única fuente.
**Alternativa descartada:** aplicarlos por la Management API (script con token de acceso):
más automático, pero exige manejar un token personal; se puede sumar después.
