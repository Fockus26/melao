# D051 · Producto · review-steps: rol canónico sin roles, rol del perfil, reviewedAt acotado, práctica final por canción · Pendiente

**Decisión:**
- Estilo con `has_roles = false`: una tarjeta por paso con rol `leader` (el enum
  `dance_role` no tiene "ambos"). El SQL rechaza otro rol (`invalid_role`).
- `status` sin `role`: se usa `profiles.dance_role`; `reviews` exige `role` en estilos con roles.
- `reviewedAt` se acota a [último repaso, ahora del servidor].
- `context` `lesson`/`practice` con repasos exige `sessionId` (la idempotencia depende de él).
- `lesson_progress` se registra si la sesión es de la lección y su canción es la
  `final_song_id` (o la lección no fija una): calificar la práctica intermedia no desbloquea.
- "No me lo sé" borra las tarjetas del paso (todos los roles); `step_reviews` queda.
- "Aprendiendo" no reinicia una tarjeta existente; "me lo sé" sobre un paso ya `known` no
  registra otro repaso.
**Por qué:** son los huecos de `srs.md`/`api.md` al implementar; se eligió lo que no pierde
datos del alumno sin querer y no depende del reloj del cliente.
**Alternativa descartada:** agregar `both` a `dance_role` (migración de enum y cambio en
todos los clientes); marcar "final" con un flag del cliente (se puede falsear).
