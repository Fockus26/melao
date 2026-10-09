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
| `order` | opcional (`review`): criterio de los pesos, `review` \| `random` \| `popular` \| `difficulty` (§ Criterio) |
| `startPhrase` | opcional (0): frase donde empieza el primer paso; con intro corta, la de la ventana de frases (`motor-de-ritmo.md` §3). Los `startPhrase` del plan salen desplazados por ella |

Cada paso trae: `id`, `startPosition`, `endPosition`, `phrases` (duración, entero ≥ 1),
`canStart`, `canEnd`, `repeatable`.

Salida: `{ plan: [{ stepId, startPhrase, phrases }], unplaced: [stepId] }`. Con `N = 0`, plan
vacío y todos los `targets` en `unplaced`. Si no existe ningún plan (p. ej. solo pasos de 2
frases y `N` impar, o ningún paso `canStart` en la posición inicial) el generador lanza
`PlanError` `no_plan`; con una entrada mal formada, `invalid_input`. Nunca se cuelga.

Implementación: `supabase/functions/_shared/core/combinaciones.ts` (`generatePlan`,
`validateCatalog`, `validateLesson`, `stepWeight`, `isBaseStep`).

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
condición se cumple. `weights[stepId]` trae `{ due?, difficulty?, favorite?, popularity? }`
(`popularity` = percentil 0–1 de `step_popularity`). `objetivoPendiente` aplica a los
`targets` comprometidos que aún no aparecen; `repeticiónInmediata`, al mismo paso que el
anterior si no es base ni `repeatable`. Los factores se multiplican **en ese orden** (importa
para reproducir el plan con aritmética de coma flotante en otra plataforma).

### Criterio (`order`, D115)

`order` (opcional, por defecto `review`) cambia **solo** los factores del alumno (los cuatro
primeros de la fórmula); `objetivoPendiente` y `repeticiónInmediata` se multiplican después,
igual en todos. Un valor desconocido → `invalid_input`. `M = 10` (`WEIGHT_ORDER_MAX`).

| `order` | Factor del alumno | Targets en `plan-session` (práctica libre) |
|---|---|---|
| `review` | la fórmula de arriba (`vencido × dificultadRepaso × favorito × popular`) | los vencidos |
| `random` | `1` (ignora vencido, dificultad, favorito y popularidad) | ninguno |
| `popular` | `1 + (M − 1) × percentil` (sin fila de popularidad: percentil 0) | ninguno |
| `difficulty` | `1 + (M − 1) × d`, con `d = (D − 1) / 9` si la tarjeta tiene dificultad FSRS; si no, `d = (c − 1) / 4` con `c` = `catalogDifficulty` (1–5); sin ninguna, `d = 0` | ninguno |

`weights[stepId]` puede traer `catalogDifficulty?` (1–5): solo lo usa `difficulty`. Con
`random`, `popular` y `difficulty` los vencidos **no** pesan: el alumno eligió otro criterio
y el repaso es el de `review`. Así el paso más popular / más difícil pesa 10 veces el menos
(en `review` el factor de popularidad va de 1 a 2 y no domina).

## Algoritmo (D042)

Recorrido aleatorio ponderado **guiado por factibilidad**; nunca retrocede.

1. **Pool** = `steps` seguido de los `baseSteps` que no estén ya (orden de entrada, sin
   duplicar ids). Todo lo que sigue recorre el pool en ese orden.
2. **Tablas de factibilidad.** Para una lista ordenada `L` de pasos obligatorios,
   `G_j(p, r)` = desde la posición `p` con `r ≥ 1` frases por llenar existe una continuación
   que coloca `L[j..]` en ese orden y acaba justo en `r` con un paso `canEnd`. Se calcula por
   programación dinámica (`j` de `|L|` a 0, `r` de 1 a `N`): `G_j(p, r)` es cierto si algún
   paso `s` del pool que sale de `p` con `s.phrases ≤ r` cumple — con `j' = j + 1` si
   `s = L[j]`, si no `j' = j` — que `r − s.phrases = 0` y `s.canEnd` y `j' = |L|`, o que
   `G_j'(s.endPosition, r − s.phrases)`.
3. **Comprometer targets** en el orden de entrada (sin duplicados). Un id fuera del pool va a
   `unplaced`. Si no, se prueba insertarlo en la lista de comprometidos, primero al final y
   luego antes de cada comprometido (de atrás hacia delante); se queda en la primera
   posición con la que existe un plan completo desde el inicio. Si ninguna sirve, va a
   `unplaced`. Si ni la lista vacía es factible → `no_plan`.
4. **Recorrido.** Desde la posición inicial, mientras queden frases: candidatos = pasos de
   `steps` que salen de la posición actual (en el primero, además `canStart`) tras los cuales
   todavía se puede terminar colocando los comprometidos pendientes (se quita del pendiente
   la primera aparición del paso elegido). Si no hay ninguno, los mismos candidatos pero de
   `baseSteps` (regla 5). Se sortea uno con su peso.
5. **Sorteo:** `u` = siguiente número del PRNG (**uno por paso del plan**, aunque haya un solo
   candidato); `x = u × Σ pesos`; se acumulan los pesos en el orden del pool y se toma el
   primer candidato con `x < acumulado` (el último si ninguno, por redondeo).

Garantía (regla 6): un target solo queda en `unplaced` si no cabe en ningún orden de
inserción junto con los comprometidos antes que él. En particular, con un solo target, se
coloca si y solo si existe algún plan que lo contenga. Costo: O(|L| · N · pasos) por tabla,
con caché por lista.

### Aleatoriedad (PRNG)

`mulberry32` sobre uint32 (`core/random.ts`). La semilla se reduce a uint32 (módulo 2^32,
negativos incluidos: `-1 → 4294967295`). Por cada número, con aritmética módulo 2^32 e `imul`
= producto de 32 bits que conserva los 32 bits bajos:

```
a = a + 0x6D2B79F5
t = imul(a ^ (a >>> 15), a | 1)
t = t ^ (t + imul(t ^ (t >>> 7), t | 61))
u = (t ^ (t >>> 14)) / 2^32        // [0, 1)
```

Referencia: la semilla 0 da `0.26642920868471265` primero (más en
`vectors/combinaciones-prng.json`).

## Invariantes (los prueban los vectores)

- Frases contiguas y suma exacta = `N`.
- Posiciones encadenadas en todo el plan.
- Primer paso `canStart`, último `canEnd`.
- Todo paso ∈ `steps` ∪ `baseSteps`.
- Determinista para la misma `seed`.
- `targets` colocados cuando es factible.

Además de los vectores, un test de propiedades (`tests/unit/core-combinaciones.test.ts`) corre
cientos de entradas aleatorias sobre un catálogo realista de casino y contrasta la regla 6
con una búsqueda exhaustiva independiente.

## Validación del catálogo (panel admin)

Desde toda posición debe existir un camino a una posición con paso base, y al menos un paso
`canEnd` alcanzable; si no, el panel avisa al guardar.

`validateCatalog({ positions, steps, startPosition })` devuelve la lista de problemas (vacía
= válido): `no_start_step` (ningún paso `canStart` sale de la posición inicial),
`no_base_reachable` y `no_end_reachable` (por posición). Paso base = categoría `base` que
empieza y termina en la misma posición (`isBaseStep`). Un catálogo válido no garantiza un plan
para todo `N` (p. ej. si todos los pasos duran 2 frases): ese caso lo reporta `generatePlan`
con `no_plan`.

### Validación de una lección (Constructor del camino, D173)

`validateLesson({ startPosition, lessonStepIds, previousStepIds, catalog })` dice si la secuencia de
una lección se puede bailar con los pasos que usaría `plan-session` (`mode: lesson`) para un
alumno **nuevo** (sin pasos `known`): conjunto = pasos de la lección + pasos de las lecciones
anteriores del curso + pasos base del estilo (`isBaseStep`), **solo los publicados** (lo que ve el
alumno). `catalog` = todos los pasos del estilo con `published`. Devuelve los problemas en este
orden (vacío = se puede bailar):

1. `no_steps`: la lección no tiene pasos (no se revisa nada más).
2. `step_unpublished` (`stepId`), por paso de la lección en su orden: el alumno no lo ve.
3. `no_start_step` (`position` = inicial): ningún paso del conjunto con `canStart` sale de la
   posición inicial.
4. Por paso publicado de la lección, en su orden: `step_unreachable` (`stepId`, `position` = su
   inicio) si no puede ir primero (`canStart` en la posición inicial) ni su inicio es alcanzable
   tras un primer paso `canStart` desde la posición inicial; si es alcanzable, `step_no_end`
   (`stepId`, `position` = su fin) si ni él es `canEnd` ni desde su fin se llega a una posición
   de la que sale un paso `canEnd`.
5. `no_base_reachable` (`position`): para la posición inicial y cada posición alcanzable, la regla
   de `validateCatalog` sobre el conjunto (desde ahí no se vuelve a una posición con paso base). Solo
   si hay paso de inicio.

Alcanzable = cierre transitivo del grafo posición → posición de los pasos del conjunto. No mira la
canción ni las frases: que no quepa ninguna combinación en `N` lo dice `generatePlan` (`no_plan`).
En el panel es un aviso (no bloquea guardar ni publicar).
Vectores: `vectors/combinaciones-leccion-*.json` (`entrada.leccion`, `salida.problemas`).

Vectores: `vectors/combinaciones-*.json` (07a). Tipos de vector según la `entrada`: plan
(`PlanInput`; `salida` = plan exacto o `{ error }`), `prng`, `casos` (pesos; `orden` opcional),
`catalogo` y `leccion`. Los `combinaciones-orden-*` fijan un plan por criterio con la misma semilla y los
pesos de cada criterio.
