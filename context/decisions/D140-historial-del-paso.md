# D140 · Producto · Historial del paso: los últimos 10 repasos propios, todos los roles · Implementado

**Decisión:** el Historial del detalle muestra el próximo repaso (tarjeta del rol) y los últimos
10 `step_reviews` de `auth.uid()` en ese paso, del más reciente, de todos los roles: calificación
(nombres de D099), dónde (lección · práctica · Pasos), el rol si el paso tiene roles y la fecha
corta. Sin repasos: "Aún no has repasado este paso." Un "no lo sé" borra la tarjeta pero no el
historial (srs.md).
**Por qué:** 10 filas de 44 caben en una pantalla de móvil junto al resto y bastan para ver la
tendencia; el historial completo no aporta en v1. Todos los roles: el alumno que practica los dos
ve todo lo que hizo con el paso, con el rol escrito.
**Alternativa descartada:** solo el rol de la tarjeta (esconde repasos reales); paginar o "ver
todo" (pantalla nueva sin pedido).
