# D173 · Arquitectura · "¿Se puede bailar?" de una lección = `validateLesson` del core, como aviso · Implementado

**Decisión:** `validateLesson` (`core/combinaciones.ts`, vectores `combinaciones-leccion-*.json`)
mira la secuencia con los pasos que usaría `plan-session` para un alumno nuevo: los de la lección,
los de las lecciones anteriores y los pasos base del estilo, solo publicados. Problemas:
`no_steps`, `step_unpublished`, `no_start_step`, `step_unreachable`, `step_no_end`,
`no_base_reachable` (la regla de relleno de `validateCatalog`). El editor lo calcula al momento
con el borrador (y el árbol, con lo guardado, para la pill "Con avisos"). No mira la canción: si no
cabe ninguna combinación en `N` frases lo dice `generatePlan` (`no_plan`). Es aviso, no bloquea
guardar ni publicar.
**Por qué:** es la misma lógica que corre en la Edge Function; en TS puro la usan igual web,
Android e iOS sin otra ida a la base. Bloquear dejaría al admin sin poder guardar a medio armar.
**Alternativa descartada:** calcularlo en SQL: duplicaría el grafo del generador en otro lenguaje.
