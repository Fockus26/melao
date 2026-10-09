# D162 · Técnica · Guardar una canción con `admin_save_song` (datos + estilos en una transacción); audio, documento y publicar, al momento · Implementado

**Decisión:** Guardar llama a `admin_save_song(p_song_id, p_song, p_style_ids)` (`security
invoker`): crea o edita título, artista, dificultad fija (null = automática), fuente, notas y
vencimiento de la licencia, y reemplaza los estilos, todo o nada. Publicar es un update de
`songs.published` aparte, con el formulario guardado. Audio (`songs`, con la duración leída en el
navegador) y documento (`song-licenses`) se escriben al subirlos (D150): una canción nueva se
guarda antes. El ritmo (`bpm`, `beat_grid`, `dance_end_ms`) no pasa por aquí: es del analizador.
**Por qué:** igual que los pasos (D153): sin canciones a medio guardar si falla la red, y una sola
llamada para Android/iOS.
**Alternativa descartada:** un solo botón para todo: los archivos no se pueden "deshacer" y
publicar exige el audio y el documento ya subidos.
