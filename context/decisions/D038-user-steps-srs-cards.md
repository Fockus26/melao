# D038 · Producto · user_steps (estado + favorito, el cliente solo toca favorito) y srs_cards (FSRS por rol) separadas · Implementado

**Decisión:** `user_steps` guarda estado ("no lo sé" / "aprendiendo" / "me lo sé") y favorito por
(alumno, paso); `srs_cards` guarda la tarjeta FSRS por (alumno, paso, rol). El cliente solo
escribe el favorito; estado, tarjetas, repasos, sesiones y progreso de lecciones los escriben
las Edge Functions (`review-steps` también completa la lección y cambia el estado).
**Por qué:** `api.md` preveía una sola tabla, pero la tarjeta es por rol (srs.md) y el favorito
por paso: juntas, el favorito se duplicaría por rol. Separadas, el cliente puede tocar el
favorito sin poder tocar ningún campo de FSRS.
**Alternativa descartada:** una tabla con permisos por columna (el favorito repetido por rol).
