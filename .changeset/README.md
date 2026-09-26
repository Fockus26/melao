# Changesets

Cada PR que cambia algo que **nota quien usa el sitio** agrega aquí un archivo
`<descripcion-kebab-case>.md` (nombre único, p. ej. `repetir-combinacion.md`):

```md
---
"<name de package.json>": minor
---

Ahora puedes repetir una combinación desde el historial.
```

- **patch**: arreglo. **minor**: función nueva. **major**: rompe datos guardados o quita algo.
- El texto va en lenguaje de usuario: qué puede hacer ahora o qué dejó de fallar, no qué
  archivo cambió.
- Docs, tests, CI y refactors: sin changeset.
- Nadie toca `version` ni `CHANGELOG.md` a mano. La Action `release.yml` mantiene abierto un
  PR "chore(release): versión" que junta los changesets, sube la versión y escribe el
  CHANGELOG. Se publica una versión cuando se mergea ese PR.

`bunx changeset` hace lo mismo con preguntas; los agentes escriben el archivo a mano.
