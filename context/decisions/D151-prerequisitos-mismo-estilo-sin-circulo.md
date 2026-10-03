# D151 · Datos · Prerequisitos del mismo estilo y sin círculo directo · Implementado

**Decisión:** trigger en `step_prerequisites`: el paso requerido es del mismo estilo (`MS003`) y
no puede requerir a su vez a este (`MS002`, A → B → A). Los círculos largos (A → B → C → A) no se
impiden todavía.
**Por qué:** lo conservador del prompt; hoy nada recorre los prerequisitos (el generador no los
usa), así que un círculo largo no rompe nada.
**Alternativa descartada:** recorrido recursivo en cada insert (más costo y más reglas para un
caso que aún no aparece). Pendiente si el camino o el generador empiezan a usarlos.
