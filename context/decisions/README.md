# decisions/

Un archivo por tema de decisión (colores, tipografía, un modo de juego, una feature
grande…), en vez de un `DESIGN_DECISIONS.md` monolítico. `DECISIONS_INDEX.md` (raíz de
`context/`) es el buscador: una línea por decisión que apunta aquí.

## Nombre

`decisions/NN-<tema>.md`, con `NN` secuencial (`01-colores.md`, `02-tipografia.md`,
`17-tutorial-inicial.md`…). Una feature grande tiene su propio archivo.

## Formato

```markdown
# Decisiones — <Tema>

## D0NN — <título corto>
**Decisión:** <qué se decidió, en 1-2 líneas>
**Por qué:** <la razón; el dato o la medición que la sostiene>
**Alternativa descartada:** <cuál y por qué no> (si la hubo)
**Estado:** Implementado | Pendiente | Obsoleta → D0NN
```

Ejemplo:

```markdown
## D001 — Primario en #0F6E8C
**Decisión:** el primario es el azul del logo, #0F6E8C, en claro; #5FB4D1 en oscuro.
**Por qué:** marca obligatoria. Texto blanco sobre #0F6E8C = 5,6:1 (AA); en oscuro,
#0B1B22 sobre #5FB4D1 = 8,1:1.
**Alternativa descartada:** #1487AD (más vivo) — 3,9:1 con texto blanco, falla AA.
**Estado:** Implementado
```

## Reglas

- Nunca se borra una decisión ni se reutiliza un ID. Si cambia: la vieja pasa a
  `Obsoleta → D0NN` y se escribe la nueva con el ID siguiente.
- Cada decisión nueva lleva su fila (una línea) en `DECISIONS_INDEX.md`.
- La escribe quien decide, al cerrar la unidad — no "después".
- Con unidades en paralelo, cada una usa el rango de IDs y el número de archivo que le
  reservó el orquestador.
