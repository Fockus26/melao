# D137 · Datos · Bandas de dificultad por BPM provisionales en el seed, sin pisar las editadas · Implementado

**Decisión:** `seed.sql` pone `difficulty_bpm_bands` a cada estilo que no las tenga (null o
vacías): salsa casino `{170,185,200,215}`, merengue `{125,140,155,170}` (4 topes → niveles 1–5
con `private.song_difficulty`). Es contenido provisional para que César lo corrija
(CONTENT_CHECKLIST fila 77). Los nombres de los niveles viven en `lib/difficulty.ts`
(`lib/songs/songs.ts` los reexporta).
**Por qué:** sin bandas, "Por dificultad" (Practicar, D117) y los chips de nivel de Canciones
(D119) no muestran nada. Rangos habituales de baile: casino ~150–220 BPM, merengue ~110–170;
las pistas de prueba del seed caen en niveles distintos (casino 1/2/3, merengue 1/3). Un
`update … where cardinality = 0` mantiene el seed idempotente y respeta lo que César edite.
**Alternativa descartada:** ponerlas en el `insert … on conflict do nothing` de estilos (no
llegaría a los estilos ya creados en el proyecto real) o en una migración (son contenido, no
esquema, y una migración las pisaría al aplicarse en un proyecto ya editado si no se condiciona).
