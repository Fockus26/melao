# Repetición espaciada (FSRS)

Algoritmo FSRS (el actual de Anki), implementación `ts-fsrs` en el backend (Edge Function
`review-steps`). Ningún cliente calcula vencimientos (D013).

## Tarjeta

Una por **(alumno, paso, rol)**. Campos: `state` (new/learning/review/relearning),
`stability`, `difficulty`, `due_at`, `last_review_at`, `reps`, `lapses`.
Parámetros: los de FSRS por defecto, retención deseada 0.90 (ajustable después).

## Calificación

| Botón en la UI | Valor | FSRS |
|---|---|---|
| Muy difícil | 1 | Again |
| Difícil | 2 | Hard |
| Bien | 3 | Good |
| Fácil | 4 | Easy |

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

Vectores: `vectors/srs-*.json` (07a).
