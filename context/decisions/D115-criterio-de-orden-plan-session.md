# D115 · Datos · `plan-session` acepta `stepFilters.order` (review/random/popular/difficulty); el criterio cambia los pesos en el core · Implementado

**Decisión:** la práctica libre elige el criterio de pasos en el backend con
`stepFilters.order` (por defecto `review` = el comportamiento de antes, mismos planes). El core
(`generatePlan`, `PlanInput.order`) cambia solo los factores del alumno: `random` = 1;
`popular` = 1 + 9 × percentil; `difficulty` = 1 + 9 × dificultad normalizada (FSRS
`(D − 1)/9` si la tarjeta ya tuvo repaso; si no, la de catálogo `(c − 1)/4`, que el handler
manda como `catalogDifficulty`). Objetivo pendiente (×5) y repetición inmediata (×0.2) siguen
igual. Con `random`, `popular` y `difficulty` no hay targets y los vencidos no pesan.
"Favoritos" sigue siendo el filtro `favoritesOnly`, no un criterio. `order` con
`mode: "lesson"` → 400 (como todo `stepFilters`). Se guarda en `practice_sessions.filters`
tal como llegó.
**Por qué:** D003 (Android/iOS piden el mismo plan con la misma semilla) y un criterio que
"domina" de verdad: el factor de popularidad de `review` va de 1 a 2; con `M = 10` el paso
más popular o más difícil pesa 10 veces el que menos. Sin vencidos en los otros criterios
porque el alumno eligió explícitamente no repasar (lo conservador: el criterio hace lo que
dice; "según repaso" sigue a un toque). Vectores `combinaciones-orden-*`.
**Alternativa descartada:** calcular los pesos por criterio en el handler y pasarle al core
solo `weights` (el core no cambiaba, pero Kotlin/Swift tendrían que copiar la regla del
handler en vez de pasar un vector); vencidos con peso reducido en todos los criterios (mezcla
dos criterios y el "aleatorio" deja de serlo).
