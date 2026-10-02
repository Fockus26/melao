# D146 · Producto · Una práctica cuenta como terminada al acabar la canción o al tocar Terminar/Continuar después de haber sonado; la X y Continuar sin empezar no la marcan · Implementado

**Decisión:** `practice_sessions.completed_at` se pone (libre y Lección) cuando la canción
termina sola, o cuando el alumno toca Terminar (libre) / Continuar (Lección) si el escenario
llegó a sonar al menos una vez (aunque esté en pausa). Salir con la X no la marca; tocar
Continuar en la mini práctica sin haber pulsado "Toca para empezar" tampoco.
**Por qué:** "Sesiones recientes" de Progreso mostraba prácticas que quizá no se bailaron (nadie
escribía `completed_at`). Terminar a mitad de canción sigue siendo una práctica real (D123
deja terminar antes y calificar lo practicado); una que nunca sonó no lo es.
**Alternativa descartada:** marcar con cualquier Terminar/Continuar (contaría prácticas sin
sonar); exigir un mínimo de tiempo sonando (regla nueva sin dato para fijar el umbral).
