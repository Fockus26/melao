# D121 · Audio · Pista sintética de la sesión: campana + bombo desde la rejilla, osciladores programados en la ventana del bucle · Implementado (web)

**Decisión:** mientras ninguna canción tiene audio con licencia (D009), la sesión suena con una
pista sintética calculada desde la rejilla (`beat_grid`, D010): campana (dos osciladores
cuadrados de 562 y 845 Hz, caída de 90 ms, filtro paso bajo a 4 kHz) en cada tiempo y bombo
(150 → 50 Hz) en el 1, fuerte, y en el `beatsPerPhrase/2 + 1`, suave. **No se renderiza:** cada
golpe se programa con `start(when)` en la ventana de 200 ms del planificador (D030), igual que
la voz. Es una `TrackSource` de `lib/player/`; el día que haya audio, `FileTrack` la reemplaza
sin tocar el reproductor. La voz, sin clips grabados, son los tonos del spike
(`makeSyntheticClips`: un tono por número, dos tonos para el anuncio).
**Por qué:** cero memoria de pista (renderizar 4–5 min a 44.1 kHz estéreo son ~85 MB y, por
frases, solo vale con BPM constante, D031) y cero espera al preparar; sigue los cambios de tempo
de la rejilla real. Los golpes viven ≤ 200 ms en el grafo y se cortan al pausar.
**Alternativa descartada:** renderizar con `OfflineAudioContext` (memoria y segundos de espera en
gama media); clave 3-2 como en el spike (es propia de la salsa: un estilo nuevo es
configuración, no código, D022); sin pista, solo la cuenta (no se puede bailar sin pulso).
**Abierta:** cómo suena es provisional; César la juzga en el teléfono.
