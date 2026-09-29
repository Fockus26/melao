# D034 · Arquitectura · Tema sin flash: clase `.dark` + script inline en `<head>`, preferencia en localStorage; sin next-themes · Implementado

**Decisión:** clase `.dark` en `<html>`. Preferencia `light` / `dark` / `system` en
`localStorage` (`melao-theme`; "sistema" = sin clave). Un script inline en `<head>`
(`THEME_INIT_SCRIPT`, `lib/theme.ts`) la aplica antes del primer pintado y, en "sistema", sigue
`prefers-color-scheme` en vivo. `<html suppressHydrationWarning>`. Sin JS se ve el tema claro.
**Por qué:** es el patrón que documenta Next 16 (guía *Preventing flash before hydration*);
son ~300 bytes sin dependencias y no depende de que una librería de terceros siga el ritmo de
React 19 / React Compiler. next-themes resuelve lo mismo con un componente cliente que inyecta
el mismo script, y además un proveedor de contexto que la app no necesita.
**Alternativa descartada:** next-themes; cookie leída en el servidor (haría dinámica toda la
app, ver la misma guía).
**Estado (detalle):** Implementado (fase 01). Sincronizar con la cuenta se decide en Perfil (07b).
