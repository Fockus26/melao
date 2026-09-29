# D020 · Proceso · CURRENT_PHASE, CONTENT_CHECKLIST, inventarios, PHASE_LOG y plans son locales · Implementado

**Decisión:** `CURRENT_PHASE`, `CONTENT_CHECKLIST`, inventarios, `PHASE_LOG/` y `plans/`
quedan en `.gitignore` (se sacan del índice sin borrarlos). En git: `PROJECT_CONTEXT`,
`DESIGN_RULES`, `COLORS`, `DESIGN_TOKENS`, `TYPOGRAPHY`, `DECISIONS_INDEX`, `decisions/`.
**Por qué:** convención del kit; en modo `pr` con PRs en paralelo, un tablero versionado
genera conflictos en cada merge.
**Alternativa descartada:** versionar todo `context/`.
**Estado (detalle):** Implementado (PR del arranque)
