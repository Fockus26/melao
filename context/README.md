# context-templates/

Se copia a cada proyecto nuevo como `context/`. Es la **documentación viva** del proyecto: lo
que hace que una sesión nueva de Claude arranque sabiendo exactamente dónde quedó todo, sin
que César tenga que reconstruir el estado a mano cada vez.

La llena `project-kickoff` en el arranque y la mantienen `frontend-build` y `backend-build`
al cerrar cada unidad de trabajo.

## Qué hay aquí

| Archivo | Qué guarda | Quién lo mantiene |
|---|---|---|
| `PROJECT_CONTEXT.md` | Qué es el proyecto, para quién, con qué stack | `project-kickoff` |
| `DESIGN_RULES.md` | Lo que no se negocia nunca | `project-kickoff` |
| `COLORS.md` | Paleta light/dark con ratios verificados | `project-kickoff`, luego `frontend-build` |
| `TYPOGRAPHY.md` | Familias y escala | idem |
| `DESIGN_TOKENS.md` | Espaciado, radios, sombras, movimiento, z-index | idem |
| `COMPONENTS_INVENTORY.md` | Qué componentes existen y dónde | `frontend-build` |
| `SECTION_INVENTORY.md` | Qué secciones existen, en qué página | `frontend-build` |
| `PAGE_INVENTORY.md` | Qué rutas existen | `frontend-build` |
| `CONTENT_CHECKLIST.md` | Todo el contenido real pendiente | todos |
| `CURRENT_PHASE.md` | Dónde estamos ahora | quien cierra la fase |
| `DECISIONS_INDEX.md` | Índice de todas las decisiones | quien decide |
| `decisions/` | El detalle, una categoría por archivo | quien decide |
| `PHASE_LOG/` | La narrativa de cada unidad (por rama) y de cada fase cerrada | quien cierra la unidad |
| `GIT_STATE.md` | Modo (`pr` / `local`) y rama base | `git-flow` |

## Cómo se lee (y cuánto cuesta)

| Nivel | Archivos | Cómo |
|---|---|---|
| Siempre | `CURRENT_PHASE.md` (≤ 60 líneas) | Se lee entero, en cada sesión |
| Según la tarea | `DESIGN_RULES`, `COLORS`, `TYPOGRAPHY`, `DESIGN_TOKENS`, `PROJECT_CONTEXT` | Solo si la tarea toca eso (tabla de `CLAUDE.md`) |
| Buscar | `DECISIONS_INDEX`, `CONTENT_CHECKLIST`, inventarios, `PHASE_LOG/`, `decisions/` | `grep` por palabra o ID; se abre solo lo que sale |

Por eso los archivos de "siempre" tienen tope y los de "buscar" tienen filas de una línea.
Detalle en `reference/TOKEN-ECONOMY.md` del kit.

## Las tres reglas que lo mantienen útil

1. **Se actualiza al cerrar cada unidad, no "después".** Saltarse este paso se siente
   eficiente en el momento y cuesta media hora de reconstrucción en la sesión siguiente.

2. **Ningún `{{placeholder}}` sobrevive al arranque.** Si un dato no existe todavía, se
   escribe `PENDIENTE` explícito y se agrega la fila a `CONTENT_CHECKLIST.md`. Un `{{TONO}}`
   que llega vivo a la fase 6 es un agente tomando decisiones a ciegas.

3. **Lo que se lee siempre se poda al cerrar cada unidad.** `CURRENT_PHASE.md` guarda lo
   abierto; lo cerrado se va a `PHASE_LOG/<rama>.md`. Un tablero que se vuelve diario se
   paga en cada sesión.

## Por qué está partido en tantos archivos

Un solo `DESIGN_DECISIONS.md` monolítico crece sin límite y a mitad de un proyecto real ya no
se puede leer. Partiendo por categoría, cada archivo se mantiene corto, `DECISIONS_INDEX.md`
sirve de buscador, y `CURRENT_PHASE.md` puede quedarse en una pantalla porque la narrativa de
lo cerrado se va a `PHASE_LOG/`.
