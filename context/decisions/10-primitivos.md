# Decisiones — Primitivos de UI (handoff §7 paso 2)

## D046 — shadcn conectado a los tokens de Melao, con un solo vocabulario de clases
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
**Estado:** Implementado (feat/ui-primitivos)

## D047 — Dos duraciones nuevas: `duration-state` 200 ms y `duration-spin` 800 ms
**Decisión:** se agregan a `design/tokens.json` (`motion`) y se regenera `tokens.css`.
`duration-state` = switch, segmentado/pestañas y diálogo que aparece; `duration-spin` = una
vuelta del spinner. `globals.css` define `animate-skeleton` (pulso 1 → .55 → 1 en
`duration-pulse`) y `animate-spinner` (giro lineal en `duration-spin`), apagadas con
`prefers-reduced-motion`.
**Por qué:** el handoff (§2 y §6) fija esos 200 y 800 ms, pero el JSON solo traía 120/160/240/
320/1600. Sin token habría valores mágicos en el switch, el diálogo y el spinner.
**Alternativa descartada:** redondear a `duration-hover` (160) o `duration-move` (240):
cambia el movimiento aprobado.
**Estado:** Implementado (feat/ui-primitivos). César puede renombrarlas; el test de tokens y
`lib/utils.ts` avisan si se desalinean.

## D048 — Medidas del handoff que se ajustaron al implementar
**Decisión:**
- Texto de ayuda/error bajo un campo (handoff: 13/18): usa `type-small` (14/20). No hay rol
  de 13 px en los tokens y un rol nuevo es decisión tipográfica; 14 es el lado legible.
- SegmentedControl y pestañas: contenedor de 50 (40 + padding 4 + borde 1). El segmento y la
  pestaña miden 40 visibles y un pseudo-elemento cubre el padding → zona táctil de 48. Sin el
  indicador que se desliza del prototipo: cambia el color en 200 ms.
- Chip: el pseudo-elemento sale 5 px (no 4) desde el borde interior para que la zona sea 48
  exactos con el borde de 1 px.
- Sheet inferior: ancho máximo `max-w-3xl` (768) en escritorio y alto máximo = viewport − 56.
- Diálogo de confirmación: bg `surface` + borde divider + sombra `modal` (el handoff dice
  "card"; la sombra es la de diálogo).
**Por qué:** son los huecos entre el handoff y lo que shadcn/los tokens permiten; se eligió lo
conservador (más legible, zona táctil ≥ 48) sin inventar tokens.
**Alternativa descartada:** agregar un rol `help` 13/18 a `tokens.json` (César eligió 14/20, 2026-09-28).
**Estado:** Aprobado (César, 2026-09-28): ayuda en 14/20, sin rol 13/18.
