# Generador de combinaciones

Corre en el backend (`plan-session`). Produce el plan de una sesión: qué paso se baila en cada
frase de la canción.

## Entradas

| Entrada | Descripción |
|---|---|
| `N` | frases disponibles (ver `motor-de-ritmo.md` §3) |
| `steps` | pasos permitidos tras aplicar filtros (estilo, dificultad, estado, favoritos…) |
| `baseSteps` | pasos de categoría base que empiezan y terminan en la misma posición (relleno) |
| `startPosition` | posición inicial del estilo |
| `targets` | pasos que deben aparecer: los de la lección, o los vencidos en el repaso |
| `weights` | factores por paso (ver abajo) |
| `seed` | entero; misma entrada + misma semilla = mismo plan |

Cada paso trae: `startPosition`, `endPosition`, `phrases` (duración), `canStart`, `canEnd`,
`repeatable`.

## Reglas

1. El primer paso tiene `canStart` y `startPosition` = posición inicial del estilo.
2. **Encadenamiento:** B puede seguir a A solo si `A.endPosition == B.startPosition`.
3. Un paso solo entra si cabe en las frases restantes.
4. El último paso tiene `canEnd`.
5. Si no hay candidato válido, se rellena con un paso base desde la posición actual.
6. Los `targets` aparecen al menos una vez si existe un encadenamiento que lo permita; los que
   no se pudieron colocar se devuelven en `unplaced`.
7. Un paso no base no se repite inmediatamente (factor de penalización), salvo `repeatable`.

## Pesos (valores iniciales, ajustables)

`w(paso) = 1 × vencido(3) × dificultadRepaso(1 + D/10) × favorito(2) × popular(1 + percentil)
× objetivoPendiente(5) × repeticiónInmediata(0.2)`

donde `D` es la dificultad FSRS de la tarjeta (1–10). Cada factor solo aplica si su
condición se cumple.

## Invariantes (los prueban los vectores)

- Frases contiguas y suma exacta = `N`.
- Posiciones encadenadas en todo el plan.
- Primer paso `canStart`, último `canEnd`.
- Todo paso ∈ `steps` ∪ `baseSteps`.
- Determinista para la misma `seed`.
- `targets` colocados cuando es factible.

## Validación del catálogo (panel admin)

Desde toda posición debe existir un camino a una posición con paso base, y al menos un paso
`canEnd` alcanzable; si no, el panel avisa al guardar.

Vectores: `vectors/combinaciones-*.json` (07a).
