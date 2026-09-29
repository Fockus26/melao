# Decisiones — Core: combinaciones y FSRS (fase 07a)

## D042 — Generador: recorrido ponderado guiado por tablas de factibilidad
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
**Estado:** Implementado (07a)

## D043 — La tarjeta del core tiene la forma de la fila de `srs_cards`
**Decisión:** `SrsCard` = `Pick<Tables<"srs_cards">, state | stability | difficulty | due_at |
last_review_at | reps | lapses>`: snake_case y fechas ISO 8601, sin claves ni `created_at`.
`reviewCard` devuelve además `{ rating, reviewed_at, due_after }` para `step_reviews`.
**Por qué:** la Edge Function escribe el resultado tal cual (sin capa de mapeo que pueda
desalinearse), el tipo sale del esquema generado (el test de deriva lo protege) y los
vectores JSON usan los mismos nombres que la base.
**Alternativa descartada:** camelCase con `Date` en el core y mapeo en la Edge Function.
**Estado:** Implementado (07a)

## D044 — FSRS sin pasos cortos (`enable_short_term: false`)
**Decisión:** parámetros por defecto de `ts-fsrs` 5.4.2, retención 0.90, sin *fuzz* y sin
pasos de aprendizaje de minutos: intervalos en días (mínimo 1), `new → review` al primer
repaso; `learning`/`relearning` no se producen.
**Por qué:** `srs_cards` no guarda `learning_steps` (ni `scheduled_days`); con pasos cortos
el índice del paso se perdería en cada lectura y una tarjeta en `learning` no se graduaría
nunca. Además un paso de baile se repasa por sesión: "Para hoy" es por día, un vencimiento a
los 10 minutos no tiene uso. Sin *fuzz*, los vectores son deterministas.
**Alternativa descartada:** migración que añade `learning_steps` a `srs_cards` y deja los pasos
por defecto (1 min, 10 min). Se puede adoptar después sin romper tarjetas existentes.
**Estado:** Implementado (07a) · aprobado por César 2026-09-28

## D045 — PRNG del core: mulberry32 sobre uint32
**Decisión:** `core/random.ts`, semilla reducida a uint32 (módulo 2^32, negativos incluidos);
un número por paso del plan. El algoritmo exacto y valores de referencia están en
`combinaciones.md` § Aleatoriedad y `vectors/combinaciones-prng.json`.
**Por qué:** 4 líneas de aritmética de 32 bits que Kotlin (`Int`, `ushr`) y Swift (`UInt32`,
`&*`) reproducen exacto; calidad sobrada para sortear pasos; sin dependencias.
**Alternativa descartada:** xoshiro128** / PCG (más estado y más código para nada que se
note aquí) y `Math.random` (no reproducible).
**Estado:** Implementado (07a)
