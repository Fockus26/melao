# D042 · Arquitectura · Generador: recorrido ponderado guiado por tablas de factibilidad (DP); targets comprometidos por prioridad · Implementado

**Decisión:** `generatePlan` compromete los `targets` en orden de prioridad (cada uno se
inserta en la lista de comprometidos si sigue existiendo un plan completo con todos en ese
orden; si no, `unplaced`) y después genera de izquierda a derecha: en cada paso solo son
candidatos los pasos tras los cuales todavía se puede terminar (suma exacta, `canEnd`,
comprometidos pendientes). La factibilidad sale de una programación dinámica sobre
(posición, frases restantes, comprometidos por colocar), O(|L|·N·pasos) por tabla, con caché.
Detalle en `docs/spec/combinaciones.md` § Algoritmo.
**Por qué:** garantiza las 6 invariantes sin retroceso ni riesgo de colgarse: nunca se entra
en un callejón sin salida, la suma exacta y el `canEnd` final salen gratis, y "target
imposible → `unplaced`" es exacto para un target (lo contrasta una búsqueda exhaustiva en el
test de propiedades). Sigue siendo aleatorio y ponderado: la tabla solo poda, no elige.
**Alternativa descartada:** elección ponderada con retroceso acotado (puede agotar el
presupuesto y fallar con catálogos válidos; el resultado depende del límite) y planificar el
camino hacia cada target primero (el tramo fijo quita variedad y no resuelve la suma exacta).
**Estado (detalle):** Implementado (07a)
