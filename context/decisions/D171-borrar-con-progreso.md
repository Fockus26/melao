# D171 · Producto · Una lección que algún alumno completó no se borra (ni su unidad) · Implementado

**Decisión:** trigger `before delete` en `lessons` y `course_units`: con `lesson_progress` en la
lección (o en alguna lección de la unidad) → `MS023`. El borrado en cascada de un curso o un
estilo (profundidad > 1) no pasa por aquí. En el editor, "Borrar la lección" queda deshabilitado
con el motivo en texto ("18 alumnos ya la completaron…"); borrar una unidad con progreso abre un
aviso que lo explica y propone mover antes esas lecciones. Sin progreso, AlertDialog de
confirmación. Las posiciones quedan con hueco hasta el siguiente reordenar (el camino del alumno
numera por orden, no por posición).
**Por qué:** `lesson_progress` cae en cascada: el alumno perdería su avance y el desbloqueo lineal
de la lección siguiente (`private.lesson_unlocked`) cambiaría sin aviso.
**Alternativa descartada:** permitirlo con una confirmación más fuerte: el daño es irreversible y
no lo ve quien borra.
