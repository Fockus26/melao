# D054 · Datos · Seed: canciones de prueba sin audio, sin licencia, sin publicar y sin nombres de canciones reales · Implementado

**Decisión:** 5 pistas "Pista de prueba N · <estilo> <tempo>", artista "Melao (placeholder)",
`audio_path` null, sin licencia y `published = false`, con `bpm`, `duration_ms`,
`dance_end_ms` y rejilla de 2–3 anclas coherente (el BPM es el promedio de la rejilla).
**Por qué:** D009 prohíbe audio sin licencia y la base no deja publicar sin él; un título
real haría parecer que hay catálogo licenciado. Sirven a `plan-session` (W5) y a la UI.
**Alternativa descartada:** títulos de salsas/merengues conocidos "de ejemplo" — confunden
con catálogo real y rozan derechos.
