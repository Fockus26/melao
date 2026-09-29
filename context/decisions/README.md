# decisions/

**Un archivo por decisión.** No hay índice aparte: la primera línea de cada archivo es su
fila de índice, y el índice se saca con `grep`. Así dos PRs en paralelo que deciden cosas
nunca chocan, igual que los changesets: cada uno trae sus archivos nuevos y nadie edita un
archivo compartido.

## Buscar

```bash
grep -rh "^# D" context/decisions/ | sort               # el índice entero (una línea cada una)
grep -rhi "^# D.*ranking\|^# D.*leaderboard" context/decisions/   # ¿hay algo decidido sobre esto?
cat context/decisions/D042-*.md                          # el detalle de una decisión citada
```

## Nombre

`decisions/D0NN-<tema-kebab>.md`: `D001-primario-azul-logo.md`, `D017-tutorial-inicial.md`.
El ID es secuencial y nunca se reutiliza.

## Formato

```markdown
# D0NN · <Categoría> · <resumen de una línea, ≤ 120 caracteres> · <Estado>

**Decisión:** <qué se decidió, en 1-2 líneas>
**Por qué:** <la razón; el dato o la medición que la sostiene>
**Alternativa descartada:** <cuál y por qué no> (si la hubo)
```

`Estado`: `Implementado` | `Pendiente` | `Obsoleta → D0NN`. Categorías habituales: Colores,
Tipografía, Tokens, Layout, Componentes, Responsive, Contenido, SEO, Datos, Auth, Pagos, QA.

Ejemplo, `decisions/D001-primario-azul-logo.md`:

```markdown
# D001 · Colores · Primario en #0F6E8C (azul del logo), #5FB4D1 en oscuro · Implementado

**Decisión:** el primario es el azul del logo, #0F6E8C, en claro; #5FB4D1 en oscuro.
**Por qué:** marca obligatoria. Texto blanco sobre #0F6E8C = 5,6:1 (AA); en oscuro,
#0B1B22 sobre #5FB4D1 = 8,1:1.
**Alternativa descartada:** #1487AD (más vivo) — 3,9:1 con texto blanco, falla AA.
```

## Reglas

- Nunca se borra una decisión ni se reutiliza un ID. Si cambia: en la cabecera de la vieja,
  el estado pasa a `Obsoleta → D0NN`, y la nueva va en su propio archivo con el ID siguiente.
- La escribe quien decide, al cerrar la unidad — no "después".
- La cabecera es una sola línea: si el resumen necesita un párrafo, el párrafo va al cuerpo.
- Con unidades en paralelo, cada una usa el rango de IDs que le reservó el orquestador. Sin
  orquestador, el ID siguiente al más alto de `main`
  (`ls context/decisions | sort | tail -1`); si al sincronizar con `main` aparece otro
  archivo con tu mismo ID, renumera el tuyo (archivo, cabecera y citas en tu rama).

## Migrar un proyecto con `DECISIONS_INDEX.md` y archivos por tema

En un PR propio, `chore/decisiones-por-archivo`, sin mezclar con otra cosa:

1. Por cada `## D0NN — <título>` de `decisions/NN-<tema>.md`, un archivo
   `decisions/D0NN-<tema-kebab>.md` con la cabecera armada desde su fila de
   `DECISIONS_INDEX.md` (ID · Categoría · Resumen · Estado) y el cuerpo sin cambios (sin la
   línea `**Estado:**`, que pasa a la cabecera).
2. Comprueba que no se pierde ninguna: el número de IDs de `DECISIONS_INDEX.md` es el mismo
   que `ls context/decisions/D*.md | wc -l`.
3. Borra `DECISIONS_INDEX.md` y los `NN-<tema>.md` viejos; cambia las citas
   `decisions/NN-<tema>.md` por el ID (`grep -rn "decisions/[0-9]" .`).
4. Actualiza `CLAUDE.md` (la tabla de "buscar, no leer" y lo que va al repo).

Los PRs abiertos que añadían filas al índice, al sincronizar con `main`: su fila pasa a ser
la cabecera de un archivo nuevo y su cambio a `DECISIONS_INDEX.md` se descarta.
