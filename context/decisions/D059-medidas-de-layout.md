# D059 · Layout · Medidas de las shells (248, 232, 72, 800, 640, 1200, 80, 72) como múltiplos de `--spacing` en clases, sin tokens nuevos · Implementado

**Decisión:** las medidas de layout del handoff §4 se escriben con la escala de Tailwind sobre
el token `--spacing: 4px` (`w-62` = 248, `w-58` = 232, `w-18` = 72, `max-w-200` = 800,
`max-w-160` = 640, `max-w-300` = 1200, `h-20` = 80, `h-18` = 72) y los breakpoints por defecto
de Tailwind (`lg` 1024, `xl` 1280), que coinciden con `DESIGN_RULES.md`. Viven solo en
`components/layout/`.
**Por qué:** todas son múltiplos de 4 (la unidad base) y hoy solo las usa la web; agregar una
categoría a `tokens.json` toca el generador, el test de tokens y los temas de Android/iOS por
ocho números que no cambian.
**Alternativa descartada:** grupo `layout` en `design/tokens.json` (→ `--layout-*`). Se hace
cuando Android/iOS reimplementen las shells y necesiten los mismos valores.
