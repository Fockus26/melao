# Fase 09 — QA final

## Objetivo

Auditoría independiente antes de entregar. Aquí **no se diseña nada nuevo**: se verifica y se
corrige lo que ya existe.

## Cómo se ejecuta

1. **Lanza `design-qa`** sobre todas las rutas. Devuelve hallazgos verificados con capturas.
2. **Lanza `functional-qa`** sobre cada flujo funcional, si el proyecto tiene backend.
3. `frontend-build` y `backend-build` corrigen los hallazgos por severidad, de arriba hacia
   abajo. Cada corrección es su propia unidad de trabajo, con su rama y su commit.
4. Se relanza el QA que corresponda para confirmar que lo corregido quedó corregido — y que
   no se rompió otra cosa de paso.

Los dos agentes de QA pueden correr en paralelo: auditan cosas distintas y no se pisan.

## Criterio de cierre

- [ ] Cero hallazgos **críticos** abiertos, en ambos QA.
- [ ] Hallazgos **altos** corregidos, o documentados con la razón y aceptados por César.
- [ ] Medios y bajos registrados en `decisions/09-qa.md` aunque no se corrijan — la decisión
      de no corregir también es una decisión, y conviene que quede escrita.
- [ ] La sección "Acciones requeridas de César" de `functional-qa` está resuelta o
      explícitamente pospuesta.
- [ ] `CONTENT_CHECKLIST.md` revisado: qué contenido real sigue pendiente para el lanzamiento.
- [ ] `CURRENT_PHASE.md` y `PHASE_LOG/09-qa.md` cerrados.

## Entrega

Al cerrar, produce un resumen para César con:

- Qué se auditó y con qué cobertura (la matriz de `design-qa`).
- Qué se corrigió.
- Qué queda abierto y por qué.
- Qué contenido real falta para poder lanzar.
- Qué acciones manuales quedan de su lado.
