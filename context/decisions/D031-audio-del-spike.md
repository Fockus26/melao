# D031 · Audio · Spike con pista sintética de 4 min (OfflineAudioContext por frases) o archivo local; clips sintéticos · Implementado (spike)

**Decisión:** el spike no trae audio en el repo. Pista **sintética** generada en el navegador
(una frase renderizada con `OfflineAudioContext` y repetida a la muestra exacta: 240 s,
estéreo, 44.1 kHz, ~81 MiB en Float32, BPM 100–210) o un **archivo del teléfono** con
`<input type="file">` (se decodifica en local; BPM y primer "1" tecleados). Clips de voz
sintéticos: un tono de 100 ms por número y un "anuncio" de dos notas que ocupa ~90 % de 2
tiempos (tope 600 ms).
**Por qué:** D009 prohíbe audio sin licencia y aún no hay clips grabados (D014,
`CONTENT_CHECKLIST` filas 26–27). Cuatro minutos decodificados son justo el tamaño de la
prueba de memoria. Renderizar la pista entera de una vez dejaba ~2000 nodos vivos en el grafo
y tardaba > 60 s en escritorio; por frases, ~0.2 s.
**Alternativa descartada:** canción real en el repo (sin licencia); síntesis de voz (D014).
**Estado (detalle):** Implementado (solo para el spike)
