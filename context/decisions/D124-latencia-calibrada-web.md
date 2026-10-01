# D124 · Audio · Latencia de la sesión: la calibración web más reciente del alumno; sin ella, la que reporta el navegador · Implementado

**Decisión:** la sesión lee `audio_latency` del alumno (`user_id = auth.uid()`, `platform =
'web'`, la de `measured_at` más reciente) y la aplica a la vista (D032). Si no hay, usa
`baseLatency + outputLatency` del contexto, como dice la spec §6, no 0.
**Por qué:** spec motor-de-ritmo §6 y D032 (3): sin calibrar, la latencia reportada (en altavoz
coincide con la medida). La web no puede saber qué salida de audio está activa, así que no se
filtra por `device_key`; la pantalla Calibrar decidirá la clave del dispositivo.
**Alternativa descartada:** 0 sin calibración (la cuenta se pintaría ~40–150 ms antes de oírse).
