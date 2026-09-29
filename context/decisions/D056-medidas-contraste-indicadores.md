# D056 · Componentes · Indicadores: barras gold-600/divider decorativas (2,98:1), sin radio 1 px, trazo 1.5 como constante y número 18 → h3 · Implementado

**Decisión:**
- Difficulty y LessonProgress conservan el par del handoff (lleno gold-600, vacío divider). Las
  barras van `aria-hidden` y **siempre** con el valor en texto ("Dificultad 3", "2 / 6" y
  `aria-valuetext`), así que no son un gráfico necesario para entender el contenido (1.4.11 no
  aplica). Medido: gold-600/divider 2,98:1 en claro (7,10:1 en oscuro); gold-600 sobre bg 3,84:1.
- Radio de 1 px de las barras de Difficulty: sin radio (`rounded-none`). No hay token de radio
  menor que `sm` (8 px) y en una barra de 4 px no se nota.
- Trazo de 1.5 px (StepStatus, anillos de PathNode): `INDICATOR_STROKE = 1.5` en
  `components/indicators/stroke.ts`, aplicado con `style`, igual que `ICON_STROKE`. Tailwind v4
  solo genera anchos de borde enteros. En pantallas de 1× Chrome lo pinta de 1 px.
- Número del PathNode (handoff 18/600): `type-h3` (20/26/600). No hay rol de 18 px; como en
  D048, se toma el lado legible sin crear un rol nuevo.
**Por qué:** subir el lleno a gold-700 daría 4,4:1 pero rompe D002 (gráficos = gold-600), y
agregar tokens de radio, borde o tipo es una decisión de sistema que no toca a esta unidad.
**Alternativa descartada:** llenos en gold-700 o vacíos en border-input (gold-600 contra
border-input ≈ 1:1, peor); tokens nuevos `radius-xs`, `border-1.5` y un rol 18/24.
