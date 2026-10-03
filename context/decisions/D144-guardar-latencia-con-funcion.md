# D144 · Datos · La latencia se guarda con `save_audio_latency()`, no con upsert directo · Implementado

**Decisión:** guardar una calibración llama a `public.save_audio_latency()` (`security invoker`):
upsert por (alumno, plataforma, `device_key`) con `measured_at = now()` y el rango −200…300.
**Por qué:** la sesión elige la calibración más reciente (D124): al repetir la de un dispositivo,
`measured_at` tiene que actualizarse con la hora del servidor, y PostgREST no puede escribir
`now()` en un upsert. El rango del ajuste también queda en el backend para Android/iOS (D003).
**Alternativa descartada:** upsert del SDK con `measured_at` del reloj del cliente (puede venir
atrasado y dejar de ser "la más reciente").
