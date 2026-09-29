# D071 · QA · Scripts con Playwright: rutas MSYS normalizadas y Chromium buscado en el AppData virtualizado (MSIX) · Implementado

**Decisión:** `a11y-check` y `pr-screenshots` llaman antes de importar Playwright a
`scripts/lib/windows-env.ts`: si `%LOCALAPPDATA%\ms-playwright` no tiene Chromium y no hay
`PLAYWRIGHT_BROWSERS_PATH`, la fijan **solo para ese proceso** a la primera copia en
`%LOCALAPPDATA%\Packages\*\LocalCache\Local\ms-playwright` (primero `Claude_*`). Las rutas
de `a11y-check` que MSYS convirtió (`/x` → `C:/Program Files/Git/x`, `/a/b` → `A:/b`) se
recuperan y se aceptan sin `/` inicial. `pr-screenshots` vacía los PNG de `.pr-shots/` al
empezar, así `shots:publish` sube solo la corrida actual.
**Por qué:** Claude Desktop y el PowerShell de la Store son apps MSIX: lo que un hijo escribe
en `%LOCALAPPDATA%` se redirige a su carpeta de paquete. `playwright install` corrió desde
Claude, así que Chromium quedó en `Packages\Claude_…\LocalCache\Local\ms-playwright` y
PowerShell (otro paquete) no lo veía en la ruta estándar (medido: `Test-Path` falso en pwsh,
presente en Git Bash; con la variable fijada, lanza Chromium 153).
**Alternativa descartada:** fijar `PLAYWRIGHT_BROWSERS_PATH` como variable de usuario o
reinstalar los navegadores fuera de MSIX: toca configuración global de la máquina y se
rompe con la próxima reinstalación desde otra app empaquetada.
