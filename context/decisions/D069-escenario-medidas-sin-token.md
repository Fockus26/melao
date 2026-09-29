# D069 · Tipografía · Escenario apaisado con los tokens stage-next 30/36 y stage-beat 22/28; alto reservado de nombres · Implementado

**Decisión:** el handoff pide en apaisado nombre siguiente 32/38 y tira 20/26, que no son
tokens: se usan `stage-next` (30/36) y `stage-beat` (22/28) en ambas orientaciones. Para que
nada salte: la fila cuenta + siguiente tiene alto mínimo 176 (3 líneas de nombre), el filete
y "entra en el 1" reservan su alto aunque no se vean, el nombre actual reserva 2 líneas y los
chips 32. Radio 2 del progreso = `rounded-pill` sobre 4 px.
**Por qué:** cero valores mágicos; con esas reservas la cuenta queda en el mismo sitio con
nombres de 32 caracteres desde 360 de ancho (medido). A 320 con dos nombres de 32 el
siguiente ocupa 6 líneas y la fila crece: se acepta (caso límite, sin scroll horizontal).
**Alternativa descartada:** tokens nuevos `stage-next-landscape`/`stage-beat-landscape`
(decisión de diseño de César); cortar el nombre con `line-clamp` (oculta texto).
