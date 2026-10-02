# D147 · Técnica · La marca de fin la escribe el cliente con su grant de columna, idempotente, con la hora del dispositivo (o `created_at` si va atrasado) y un reintento sin aviso · Implementado

**Decisión:** `update practice_sessions set completed_at = <ahora> where id = … and
completed_at is null` desde el navegador (grant `update (completed_at)` y la política "el dueño
la cierra", `20260927180000_progreso.sql`; RLS pone `user_id = auth.uid()`). Una sesión ya
marcada conserva su primera hora. Si el reloj del dispositivo va atrasado y choca con
`check (completed_at >= created_at)` (`23514`), se lee `created_at` y se usa el mayor. Si
falla, un reintento y se deja; nunca bloquea la navegación (`lib/stage/completion.ts`).
**Por qué:** sin migración en esta unidad y el contrato ya daba ese permiso al cliente; la hora
exacta del fin no la usa ninguna regla todavía.
**Alternativa descartada:** función SQL `complete_practice_session(p_id)` con `now()` del
servidor (hora fiable y una sola llamada para Android/iOS; requiere migración: se propone si
algún día la hora del fin importa).
