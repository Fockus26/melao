# D064 · Arquitectura · plan-session: semilla uint32; si no viene, la genera el servidor, se guarda y se devuelve · Pendiente

**Decisión:** `seed` es un entero 0–4294967295. Sin `seed`, el servidor genera uno con
`crypto.getRandomValues` (puerto `randomSeed`, fijo en los tests), lo guarda en
`practice_sessions.seed` y lo devuelve en la salida.
**Por qué:** el core usa la semilla como uint32 (D045); aceptar solo ese rango hace que la
semilla guardada sea exactamente la efectiva y que la sesión se pueda reproducir en cualquier
plataforma. Devolverla permite "Otra vez" con el mismo plan.
**Alternativa descartada:** aceptar cualquier entero y reducirlo (dos semillas distintas darían
el mismo plan y lo guardado no sería lo usado); o que el cliente genere siempre la semilla
(cada plataforma con su generador, y un cliente podría fijarla).
