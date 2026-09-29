# D005 · Arquitectura · Móvil: Kotlin y Swift nativos después; docs/spec es el contrato; sin Capacitor/Expo · Pendiente

**Decisión:** ahora solo web (Next.js). Después Android nativo (Kotlin) y luego iOS (Swift),
reimplementando la misma UI y funcionalidad. Sin Capacitor ni Expo.
**Por qué:** decisión de César. El contrato que lo hace posible: `docs/spec/` (producto,
pantallas, API, motor de ritmo, vectores de prueba), `design/tokens.json` y
`messages/es.json`.
**Alternativa descartada:** Capacitor (empaquetar la web) y Expo universal.
