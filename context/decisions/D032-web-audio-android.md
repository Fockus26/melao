# D032 · Audio · Web Audio validado en Android; latencyOffsetMs solo a UI y toques, nunca a los clips (spec §6) · Aprobado (Android) · iOS pendiente

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
**Estado (detalle):** Aprobado para Android · iOS pendiente
