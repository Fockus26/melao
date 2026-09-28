# Repetición espaciada (FSRS)

Algoritmo FSRS (el actual de Anki), implementación `ts-fsrs` en el backend (Edge Function
`review-steps`). Ningún cliente calcula vencimientos (D013).

## Tarjeta

Una por **(alumno, paso, rol)**. Campos: `state` (new/learning/review/relearning),
`stability`, `difficulty`, `due_at`, `last_review_at`, `reps`, `lapses`.
Parámetros: los de FSRS por defecto, retención deseada 0.90 (ajustable después), sin *fuzz*
(determinista) y **sin pasos cortos** (`enable_short_term: false`, D044): los intervalos son
en días (mínimo 1) y una tarjeta pasa de `new` a `review` al primer repaso; `learning` y
`relearning` quedan en el enum pero el core no los produce. Un "Muy difícil" sobre una
tarjeta en `review` suma un `lapse` y la deja en `review` con estabilidad baja.

Implementación: `supabase/functions/_shared/core/srs.ts` sobre `ts-fsrs` **5.4.2** (misma
versión fijada en `package.json` y en `supabase/functions/deno.json`). El core recibe y
devuelve la tarjeta con los nombres y tipos de la fila de `srs_cards` (snake_case, fechas
ISO 8601 UTC), sin las claves ni `created_at` (D043). `now` siempre se inyecta.

| Función | Hace |
|---|---|
| `toFsrsRating(1–4)` | calificación → `Rating` (lanza fuera de 1–4) |
| `markLearning(now)` | tarjeta `new` con `due_at = now` |
| `reviewCard(card, rating, now)` | `{ card, review: { rating, reviewed_at, due_after } }`: tarjeta siguiente + datos de la fila de `step_reviews` (`due_after` = nuevo `due_at`) |
| `markKnown(now)` | `reviewCard(markLearning(now), 3, now)` |
| `isDue(card, now)` | `due_at ≤ now` |

El intervalo se calcula desde `last_review_at` (un repaso tardío cuenta los días reales).

## Calificación

| Botón en la UI | Valor | FSRS |
|---|---|---|
| Muy difícil | 1 | Again |
| Difícil | 2 | Hard |
| Bien | 3 | Good |
| Fácil | 4 | Easy |

La tarjeta vive en `srs_cards`; el estado del catálogo y el favorito, en `user_steps` (D038).
Cada calificación genera una fila en `step_reviews` (con el contexto: lección o práctica, y la
sesión) y actualiza la tarjeta.

## Estados del catálogo

| Acción del alumno | Efecto |
|---|---|
| "Me lo sé" | crea la tarjeta y registra un repaso **Good** en ese momento |
| "Aprendiendo" | crea la tarjeta en estado `new` (entra a la cola de aprendizaje) |
| "No me lo sé" | sin tarjeta activa; el historial no se borra |
| Completar una lección | los pasos calificados en la práctica final quedan con su repaso |

## Uso en la práctica

- "Para hoy" = tarjetas con `due_at ≤ ahora`.
- El generador prioriza vencidos y los de mayor `difficulty` (ver `combinaciones.md`).
- Al terminar una sesión se califica cada paso distinto que apareció; los que no estaban
  vencidos se pueden saltar (no generan repaso).

Vectores: `vectors/srs-*.json` (07a). Cada uno es una secuencia `entrada.pasos` de operaciones
(`markLearning`, `markKnown`, `review` con `rating` y opcionalmente `card`, `isDue`) sobre la
tarjeta en curso; `salida.resultados` trae el resultado de cada una. `stability` y
`difficulty` se comparan con tolerancia 1e-6; fechas y enteros, exactos.
