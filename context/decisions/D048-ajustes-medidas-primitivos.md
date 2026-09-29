# D048 · Diseño · Ajustes de medidas al implementar primitivos (ayuda 14/20, zonas táctiles de chip/segmento, sheet y diálogo) · Aprobado (César, 2026-09-28)

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
**Estado (detalle):** Aprobado (César, 2026-09-28): ayuda en 14/20, sin rol 13/18.
