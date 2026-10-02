# D128 · Producto · Catálogo de pasos: filtros en el cliente, grupos en el orden del enum y dentro el del admin · Implementado

**Decisión:** búsqueda (nombre, sin acentos, todas las palabras) y chips de Categoría y Estado
filtran en el cliente sobre lo que devolvió `step_catalog` (mismo criterio que Canciones, D119):
varios chips de un grupo = cualquiera; entre grupos, todos. Chips de Categoría solo con las que
hay en el estilo y solo si hay más de una. Estado en la URL con valores en inglés (D077):
`?q=&category=base,turn,entry,exit,figure,variation,free&status=unknown,learning,known` (+ `style`),
con `history.replaceState`. Grupos por categoría en el orden del enum (Pasos base, Vueltas,
Entradas, Salidas, Figuras, Variaciones, Pasos libres); dentro, `sort_order` del admin y luego
nombre (lo ordena SQL). Próximo repaso por días de calendario del dispositivo: vencido u hoy =
"Toca hoy", "Repaso mañana", "Repaso en N días"; sin tarjeta, nada. Segmentado de estilo con más
de un estilo publicado, como en Canciones.
**Por qué:** la lista de un estilo es corta (hasta ~80); el orden del admin es el pedagógico (el
mismo del curso y del seed) y el del enum va de lo básico a lo libre. Vencido y hoy se dicen igual
porque para el alumno significan lo mismo: toca repasarlo.
**Alternativa descartada:** orden alfabético dentro del grupo (rompe la progresión que arma el
admin); grupos en el orden de aparición por `sort_order` (cambia si el admin reordena un paso);
"Vencido hace N días" (culpa sin aportar: el repaso ya está pendiente); valores de categoría en
español en la URL (contra D077).
