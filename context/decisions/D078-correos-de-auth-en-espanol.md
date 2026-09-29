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
**Requisito (2026-09-29):** en el plan gratis, Supabase solo deja editar las plantillas con un
**SMTP propio** (sin él pide Pro), y su SMTP de fábrica solo envía a miembros del equipo del
proyecto, con límite bajo por hora. Para correos en español y para alumnos reales hace falta
configurar un SMTP propio (Supabase › Auth › Emails › SMTP Settings); hasta entonces los correos
salen en inglés y solo a César.
