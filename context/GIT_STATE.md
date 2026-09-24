# Git State — {{NOMBRE_DEL_PROYECTO}}

> Fuente de verdad de "¿cómo y a dónde se entrega esta unidad?". La skill `git-flow` lo lee
> antes de crear cualquier rama. **Nunca deduzcas la base de `git branch --show-current`.**

## Modo

**`{{pr | local}}`**

| Modo | Cuándo | Cierre de una unidad |
|---|---|---|
| `pr` | Hay remoto y `main` protegida (lo normal en cuanto el repo está en GitHub) | commit(s) en la rama → push de la rama → `gh pr create` → **César revisa y mergea** (squash) |
| `local` | Sin remoto, o César lo prefiere | pausa de aprobación → commit → merge `--no-ff` a la base → push solo si la base ≠ `main` |

En modo `pr` el estado de las ramas es `gh pr list`: la tabla de abajo sobra (déjala vacía).

## Rama base de la próxima unidad

`{{main | nombre-de-la-rama-madre}}`

## Rama madre activa (solo modo `local`, bloques grandes)

`{{nombre-de-la-rama-madre | ninguna}}`

## Ramas de trabajo (solo modo `local`)

| Rama | Base | Unidad | Estado |
|---|---|---|---|
| {{design/hero}} | {{design/integration}} | {{Sección hero}} | {{abierta / en revisión / mergeada}} |

<!-- No se borran ramas mergeadas: borrar es destructivo y lo decide César. -->
