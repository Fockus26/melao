# PHASE_LOG/

La narrativa de lo cerrado. **Un archivo por unidad** (por rama) y, al cerrar una fase
completa, uno de resumen de la fase. Se consulta con `grep` o cuando `CURRENT_PHASE.md`
enlaza a uno; no se lee por defecto.

## Por qué

`CURRENT_PHASE.md` se lee en cada sesión y tiene que caber en una pantalla. Todo lo que
explica *cómo* se cerró algo (qué se verificó, qué no, hallazgos vistos de paso) crece sin
límite si vive ahí — en el primer proyecto real llegó a 38 KB. Aquí no molesta: nadie lo
paga salvo quien lo busca.

## Nombre

- Unidad: `PHASE_LOG/<rama-con-guiones>.md` (p. ej. `feat-ranking-top20.md`).
- Fase completa: `PHASE_LOG/0N-<fase>.md`, con enlaces a los de sus unidades.

## Formato (unidad)

```markdown
# <rama> — <qué> (PR #N · versión X.Y.Z)

## Estado
<abierta / en revisión / mergeada el AAAA-MM-DD>

## Qué se hizo
- <2-5 bullets>

## Verificado (y cómo)
- <qué, en qué anchos/temas, con qué herramienta>

## No verificado
- <qué y por qué: sin cuenta de prueba, sin dispositivo real…>

## Decisiones
- D0NN — <1 línea> (detalle en decisions/NN-<tema>.md)

## Contenido provisional
- Fila #NN de CONTENT_CHECKLIST — <qué texto>

## Acciones de César
- <SQL a correr, dashboard a configurar, orden de despliegue>

## Visto de paso (no tocado)
- <bugs ajenos a la unidad, para otra rama>
```

## Reglas

- Lo escribe quien cierra la unidad, antes del PR / del merge local.
- Si la unidad la hizo un worker en un worktree sin acceso de escritura a la carpeta
  principal, lo entrega en su informe y el orquestador lo copia aquí.
- `CURRENT_PHASE.md` solo guarda la fila de la unidad con el enlace a este archivo.
