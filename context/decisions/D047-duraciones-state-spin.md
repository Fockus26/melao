# D047 · Tokens · Duraciones nuevas: duration-state 200 ms y duration-spin 800 ms (handoff §2/§6) · Aprobado (César, 2026-09-28)

**Decisión:** se agregan a `design/tokens.json` (`motion`) y se regenera `tokens.css`.
`duration-state` = switch, segmentado/pestañas y diálogo que aparece; `duration-spin` = una
vuelta del spinner. `globals.css` define `animate-skeleton` (pulso 1 → .55 → 1 en
`duration-pulse`) y `animate-spinner` (giro lineal en `duration-spin`), apagadas con
`prefers-reduced-motion`.
**Por qué:** el handoff (§2 y §6) fija esos 200 y 800 ms, pero el JSON solo traía 120/160/240/
320/1600. Sin token habría valores mágicos en el switch, el diálogo y el spinner.
**Alternativa descartada:** redondear a `duration-hover` (160) o `duration-move` (240):
cambia el movimiento aprobado.
**Estado (detalle):** Implementado (feat/ui-primitivos). César puede renombrarlas; el test de tokens y `lib/utils.ts` avisan si se desalinean.
