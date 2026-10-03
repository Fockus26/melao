# D168 · Arquitectura · Camino del admin: una lectura (`admin_course`) y releerla tras cada escritura · Implementado

**Decisión:** `/admin/course` lee todo el constructor con `admin_course(p_style_id)` (jsonb: estilo,
posiciones, pasos, canciones, curso, unidades y lecciones con sus pasos en orden, alumnos que la
completaron y avisos de canción). Cada escritura (crear, renombrar, mover, guardar, borrar,
publicar) va por el puerto y después la pantalla vuelve a pedir `admin_course`; el orden se
aplica antes en pantalla y vuelve atrás si la base lo rechaza. La lección abierta
(`?lesson=<uuid>`) se elige en el cliente sobre esos datos. La lección se guarda entera con
`admin_save_lesson` (datos + pasos en orden, todo o nada).
**Por qué:** el árbol, la validación y los selectores de canción necesitan lo mismo; una sola
llamada evita estados a medias entre tablas y es igual en Android e iOS.
**Alternativa descartada:** lecturas por tabla con la RLS y `router.refresh()` tras cada cambio:
más idas y vueltas y pierde lo optimista del arrastre.
