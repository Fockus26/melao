# D025 · Proceso · Versión con Changesets; PR de versión lo abre la Action y lo mergea César; pool de worktrees · Implementado

**Decisión:** ningún PR toca `version` ni `CHANGELOG.md`. Cada PR con cambio visible agrega
`.changeset/<desc>.md`; la Action `release.yml` mantiene el PR `chore(release): versión`, que
abre la Action y mergea César. Las tandas de `orchestrate` usan el pool fijo de worktrees
(`..\melao-wt\wtN`, gestionado por `wt.ps1`) en vez de un worktree nuevo por unidad.
**Por qué:** el kit cambió (2026-09-26): subir versión en cada PR chocaba entre PRs
paralelos, y crear/borrar un worktree por unidad reinstalaba `node_modules` cada vez.
Se arranca desde `0.1.0`, sin CHANGELOG previo.
**Alternativa descartada:** proyecto sin versión (`-SinVersion` del kit).
**Estado (detalle):** Implementado (PR `chore/changesets`)
