# D166 · Datos · Una posición se borra solo si ningún paso la usa y no es la inicial; el slug no cambia · Implementado

**Decisión:** trigger `before delete` en `positions` (escrituras de la API): usada como entrada o
salida de algún paso → `ME006`; inicial del estilo → `ME007`. En la cascada del borrado de su
estilo no actúa. Las posiciones se añaden (nombre + slug), se renombran y se borran al momento,
sin esperar a "Guardar"; el panel no cambia el slug después de crearla.
**Por qué:** los pasos referencian posiciones sin cascade (la FK daría un `23503` sin explicar) y
la FK diferida de la posición inicial fallaría recién en el commit. El slug de posición no se usa
en URLs, pero lo usa el seed por nombre: dejarlo fijo evita sorpresas.
**Alternativa descartada:** reasignar los pasos a otra posición al borrar: cambia el grafo de
combinaciones en silencio.
