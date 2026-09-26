# Decisiones — Tokens (fase 01)

## D033 — `tokens.json` → CSS con un generador propio, no Style Dictionary
**Decisión:** `scripts/tokens.ts` (`bun run tokens`) genera `app/tokens.css` desde
`design/tokens.json` con el núcleo puro de `lib/tokens/` (lectura, alias, CSS, contraste). El
CSS generado se commitea y `tests/unit/tokens.test.ts` falla si diverge del JSON. Precisa D018
("Style Dictionary genera el CSS", pendiente de verificar al implementar).
**Por qué:** la salida que necesita la web es `@theme static` de Tailwind v4 (con sub-tokens
`--text-<rol>--line-height/--letter-spacing/--font-weight`), overrides de `.dark` con los
mismos nombres, `--color-stage-*` fuera de `.dark`, alias de shadcn y utilidades `@utility`.
Style Dictionary (v4/v5, consultado en Context7) solo da `css/variables` plano: todo eso
exigiría un formato a medida del mismo tamaño que el generador, más una dependencia. El
JSON sigue siendo W3C Design Tokens, así que Compose/SwiftUI pueden usar Style Dictionary
(u otro) sobre el mismo archivo cuando lleguen.
**Alternativa descartada:** Style Dictionary con `registerFormat` para `@theme` y el tema oscuro.
**Estado:** Implementado (fase 01)

## D034 — Tema sin flash con script inline en `<head>`, sin next-themes
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
**Estado:** Implementado (fase 01). Sincronizar con la cuenta se decide en Perfil (07b).

## D035 — Utilidades de tipografía: `type-<rol>` completa, `text-<rol>` solo tamaño
**Decisión:** cada rol del JSON genera `--text-<rol>` en `@theme` (Tailwind da `text-<rol>`:
tamaño, interlineado, peso y tracking) y una utilidad `type-<rol>` que además fija la familia
(Fraunces/Geist), las mayúsculas y las cifras tabulares. En componentes se usa `type-<rol>`.
Los roles `numeric-*` y `stage-*` llevan siempre `tabular-nums`. Se vacían los tamaños de
Tailwind (`--text-*: initial`): `text-sm`, `text-lg`… no existen.
**Por qué:** `--text-*` de Tailwind no admite familia, `text-transform` ni
`font-variant-numeric`; con solo `text-h1` cada uso tendría que acordarse de `font-serif` y
`uppercase`, y ahí se cuela Fraunces en un botón o un eyebrow sin mayúsculas. Ninguno de los
pares del handoff falló AA (134 pares medidos), así que no hizo falta ajustar tonos.
**Alternativa descartada:** solo `text-<rol>` + clases sueltas; o solo `type-<rol>` (se pierde
`md:text-h1` para cambiar tamaño por breakpoint).
**Estado:** Implementado (fase 01)
