# D172 · Producto · Reordenar el camino: arrastre con puntero y teclado dentro de su lista, y menú para el resto · Implementado

**Decisión:** `admin_move_unit(unit, position)` y `admin_move_lesson(lesson, unit, position)`
renumeran 1…n la lista afectada en una transacción (el `unique (…, position) deferrable` se
comprueba al final; la posición se acota; mover entre unidades cierra el hueco del origen; a una
unidad de otro curso → `22023`). En la web, `@dnd-kit` (core + sortable): se arrastra el asa de
40 con puntero o con teclado (Espacio/Enter levanta, flechas, Espacio suelta, Escape cancela) con
anuncios en español; unidades entre sí, lecciones dentro de su unidad y pasos dentro de la lección.
Cada fila tiene además un menú (Subir, Bajar y "Mover al final de" otra unidad; WCAG 2.5.7) y los
pasos, botones Subir/Bajar/Quitar. Con el curso publicado, un texto avisa que el orden cambia qué
lección desbloquea cada alumno; no se bloquea.
**Por qué:** arrastrar entre contenedores con teclado en dnd-kit exige detección de colisiones
propia y es frágil; el menú cubre ese caso con un solo gesto y es accesible.
**Alternativa descartada:** una función que reciba el orden completo del curso: más fácil de
desordenar con dos pestañas abiertas y no corresponde a un gesto del usuario.
