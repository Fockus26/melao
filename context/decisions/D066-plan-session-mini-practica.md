# D066 · Producto · plan-session: mini práctica con `focusStepId` (N ≤ practice_phrases); errores no registran sesión · Pendiente

**Decisión:** `mode: "lesson"` acepta `focusStepId` (un paso de la lección): la mini práctica
de ese paso, con él y los pasos de lecciones anteriores como pool, él como único target y
`N = min(N, lessons.practice_phrases)`. `stepFilters` solo vale en `free`. Si la petición
falla (reglas, `song_too_short`, `no_plan`) no se escribe nada: la sesión se registra en una
sola llamada al final.
**Por qué:** producto.md §2 pide una mini práctica por paso ("pocas frases") y `lessons` ya
guarda `practice_phrases`, pero el contrato no distinguía mini de final: sin el campo, la
canción de práctica y la final pueden coincidir (seed) y no hay cómo saber cuál se pide. Una
sesión vacía o fallida contaría en la popularidad.
**Alternativa descartada:** deducir la mini práctica de `songId = practice_song_id`
(ambiguo); o un campo `stage: "mini"|"final"` (igual necesita el paso).
