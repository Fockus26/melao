# D033 · Arquitectura · Tokens: generador propio `scripts/tokens.ts` → `app/tokens.css` (@theme de Tailwind v4), no Style Dictionary · Implementado

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
**Estado (detalle):** Implementado (fase 01)
