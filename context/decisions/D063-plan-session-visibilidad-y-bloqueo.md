# D063 · Producto · plan-session: contenido visible como con RLS (admin ve lo no publicado), lección bloqueada = 403 · Pendiente

**Decisión:** `plan-session` acepta estilo, canción y lección solo si quien llama los vería con
RLS: el alumno, lo publicado (canción con licencia vigente); el admin, también lo no
publicado (las canciones del seed, sin audio, D054). Lo que no ve responde 404, igual que lo
inexistente. Una lección cuya anterior (en orden de unidad y posición) no está completada
responde 403 `lesson_locked`, salvo para el admin. La suscripción activa se exige a todos,
también al admin (como `review-steps`).
**Por qué:** el backend es la fuente de las reglas (D003): el desbloqueo lineal del curso
(producto.md §2) no puede depender del cliente. El admin necesita probar el coach con
contenido en borrador antes de publicarlo; las políticas de contenido ya le dejan leerlo.
**Alternativa descartada:** rechazar las canciones no publicadas para todos (el admin no podría
probar nada hasta tener audio con licencia); o eximir al admin de la suscripción (divergiría
de `review-steps` y de las demás funciones; en v1 activar una es gratis).
