# D046 · Arquitectura · shadcn (radix-nova, lucide) con las clases de los tokens, sin @theme inline propio; `cn` configurado con los tokens · Implementado

**Decisión:** `shadcn init` (estilo `radix-nova`, `radix-ui`, `lucide-react`) sin el bloque
`@theme inline` ni las variables `oklch` que el CLI escribe en `globals.css`: los primitivos
de `components/ui/` se reescriben con las utilidades de los tokens (`bg-bg`, `text-text`,
`border-border-input`, `bg-primary text-on-primary`, `rounded-md`, `type-<rol>`…). Los alias
`--primary`, `--ring`, `--input`… que ya genera `tokens.css` (D006) quedan para librerías de
terceros que los lean. `globals.css` importa `tw-animate-css` (entradas y salidas) y
`shadcn/tailwind.css` (variantes `data-open`, `data-checked`…). `cn` (`lib/utils.ts`) es el
paquete `cn` de shadcn configurado con los roles de texto, radios, sombras y duraciones del
JSON: sin eso, `text-small` y `text-text` se pisan y `rounded-pill` no se reconoce. Un test
compara esas listas con `design/tokens.json`.
**Por qué:** con `--color-*: initial` (D033) el bloque de shadcn duplicaría cada color con
otro nombre (`bg-background` = `bg-bg`) y `--color-primary: var(--primary)` sería circular;
sus radios (`--radius-sm: calc(var(--radius) * .6)`) pisarían los del handoff. Un solo
vocabulario hace que Android/iOS lean los mismos nombres en código y en `tokens.json`.
**Alternativa descartada:** conservar las clases de shadcn (`bg-background`, `ring-ring/50`)
mapeando sus nombres a los tokens en `@theme inline`; los componentes que se agreguen después
con `shadcn add` hay que ajustarlos igual (sus medidas no son las del handoff).
**Estado (detalle):** Implementado (feat/ui-primitivos)
