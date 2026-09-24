# Git State — Melao

> Fuente de verdad de "¿cómo y a dónde se entrega esta unidad?". La skill `git-flow` lo lee
> antes de crear cualquier rama. **Nunca deduzcas la base de `git branch --show-current`.**

## Modo

**`pr`** — remoto `git@github.com:Fockus26/melao.git`, `main` protegida con el check `ci`
obligatorio.

| Modo | Cuándo | Cierre de una unidad |
|---|---|---|
| `pr` | Hay remoto y `main` protegida (lo normal en cuanto el repo está en GitHub) | commit(s) en la rama → push de la rama → `gh pr create` → **César revisa y mergea** (squash) |
| `local` | Sin remoto, o César lo prefiere | pausa de aprobación → commit → merge `--no-ff` a la base → push solo si la base ≠ `main` |

En modo `pr` el estado de las ramas es `gh pr list`: la tabla de abajo sobra.

## Rama base de la próxima unidad

`main`

## Rama madre activa (solo modo `local`, bloques grandes)

`ninguna` — en modo `pr` cada unidad sale de `main` y vuelve por su PR.

## Ramas de trabajo (solo modo `local`)

| Rama | Base | Unidad | Estado |
|---|---|---|---|

<!-- No se borran ramas mergeadas: borrar es destructivo y lo decide César. -->
