# D062 · Layout · Riel del admin < 1280 (también < 1024) con etiqueta al foco; escenario con `.dark` en su subárbol · Implementado

**Decisión:**
- AdminNav: 232 con etiquetas ≥ 1280 y riel de 72 debajo, **incluso bajo 1024** (el admin es
  de tablet y escritorio; a 320 no hay scroll horizontal). Cada ítem del riel lleva
  `aria-label` y muestra su nombre en una etiqueta flotante al enfocar con teclado o al pasar
  el puntero; se puede pasar el puntero a la etiqueta y Esc la oculta (WCAG 1.4.13). Activo en
  el riel: fondo gold-tint + filete gold-600 de 2 × 24 a la izquierda (no solo color). El nav
  va en el flujo, no fijo, para que la etiqueta no quede recortada.
- FullscreenShell `stage`: fondo `stage-bg` y la clase `dark` en el subárbol, así el escenario
  no hereda el tema de la app y el anillo de foco y cualquier token suelto toman el valor
  oscuro (dorado sobre negro) también en tema claro.
- BottomNav en rutas sin destino propio (p. ej. `/app/progreso`): queda activo el prefijo más
  largo (Inicio), coherente con que Progreso se abre desde Inicio (D028).
**Por qué:** el handoff solo dibuja el admin a 1440 y 1024 y no dice cómo se ve el nombre en
el riel; lo conservador es no ocultar nada por hover y no inventar un tercer layout de admin.
**Alternativa descartada:** barra superior con menú para el admin < 1024 (diseño nuevo, sin
handoff).
