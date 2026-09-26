# Decisiones — Motor de audio (spike 07a·1)

## D030 — Planificador "two clocks": lookahead de 200 ms, bucle cada 25 ms, todo en un AudioContext
**Decisión:** la canción y los clips van por un único `AudioContext`. Un bucle con
`setInterval` cada **25 ms** programa con `AudioBufferSourceNode.start(when)` los eventos cuyo
`tProgramado` cae en los próximos **200 ms** de pista; el timer solo decide *qué* programar, el
*cuándo* lo fija el reloj de audio. La posición de la pista se deriva siempre del reloj
(`currentTime − ancla`); pausar guarda esa posición, corta las fuentes y reanudar recalcula
ancla y cursor (`lib/audio/scheduling.ts`). Un clip que llega tarde suena de inmediato si el
retraso es ≤ 50 ms y se omite si es mayor. La calibración de latencia se usa para pintar la
cuenta; aplicarla a los clips queda detrás de un interruptor, apagado por defecto.
**Por qué:** el patrón estándar de Web Audio para precisión de muestra con timers imprecisos.
200 ms cubre un tiempo entero a 210 BPM (286 ms) menos margen y aguanta que el bucle se
retrase varias vueltas; como pausar corta los nodos ya programados, una ventana más larga no
cuesta desfase. Pista y clips comparten la latencia de salida, así que restarla solo a los
clips los adelantaría; se mide en la prueba 5 de `docs/spike/audio.md`.
**Alternativa descartada:** `HTMLAudioElement` para la pista (otro reloj, deriva respecto de
Web Audio); `ctx.suspend()` como pausa (no sirve para el estado `interrupted` de iOS ni para
reanudar desde una posición arbitraria); lookahead de 100 ms (cualquier freno del hilo
principal > 100 ms deja clips tarde).
**Estado:** Validado en Android (D032); iOS pendiente

## D031 — Audio del spike: pista sintética de 4 min y archivo local; clips sintéticos
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
**Estado:** Implementado (solo para el spike)

## D032 — La web aguanta el reproductor en Android; la calibración de latencia no toca los clips
**Decisión:** (1) el reproductor web de la v1 va con Web Audio y el planificador de D030: en
Android pasa los cuatro criterios (deriva ≈ 0 ms en 4 min y tras 3 pausas, sin recarga con
una canción real de 5 min / 116 MB, Wake Lock estable, sigue sonando con la pantalla
bloqueada). (2) `latencyOffsetMs` se aplica **solo a la UI y a los toques**, nunca a los
clips: la canción y la voz salen por el mismo motor y ya van juntas. Cambia
`docs/spec/motor-de-ritmo.md` §6 (antes: `tProgramado = tMs − latencyOffsetMs`). (3) Sin
calibrar se usa la latencia que reporta la plataforma; con Bluetooth se ofrece calibrar.
**Por qué:** resultados del 2026-09-26 en `docs/spike/audio.md`. Con altavoz el navegador
conoce su latencia (calibración 37–51 ms vs. 48 ms reportados). Con Bluetooth la subestima
(~336 ms medidos vs. ~152 ms reportados). Al restar 344 ms a los clips, César oyó la cuenta
"en tiempo pero desfasada de la música por un tiempo": 344 ms ≈ un tiempo a 180 BPM, la
cuenta caía un tiempo antes.
**Alternativa descartada:** restar la latencia a los clips (adelanta la voz respecto de la
canción); confiar siempre en la latencia reportada (falla con Bluetooth); adelantar la app
nativa por riesgo de audio (en Android no hace falta).
**Límites:** probado en un solo Android (POCO X6 Pro, ≥ 8 GB de RAM). **iOS/Safari sin probar** (César no
tiene iPhone): lista i1–i9 en `docs/spike/audio.md`; bloquea la salida en iOS, no el resto de
07a. Falta un Android de gama media real (≤ 4 GB): pospuesto, no bloquea.
**Estado:** Aprobado para Android · iOS pendiente
