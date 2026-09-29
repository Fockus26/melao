# D053 · Datos · Seed: posiciones guapea/cerrada/abierta (salsa) y cerrada/abierta (merengue); dos pasos base por estilo · Pendiente

**Decisión:** salsa casino arranca en `guapea` y tiene `cerrada` y `abierta` (tras el
abanico); merengue arranca en `cerrada` y tiene `abierta`. Pasos base (relleno del
generador): Guapea y Básico en cerrada; Básico y Básico en abierta. `abierta` de salsa no
tiene base propia: vuelve a `cerrada` con Cierre al centro. Dile que sí = guapea → cerrada,
Dile que no = cerrada → guapea.
**Por qué:** es el grafo mínimo que ya usa el test de propiedades del generador
(`core-combinaciones.test.ts`) y pasa `validateCatalog`; cada posición alcanza un base y un
`can_end`. Todo es propuesta para que César corrija (CONTENT_CHECKLIST fila 32).
**Alternativa descartada:** más posiciones (mano con mano, cruzada, rueda) — agrandan el
grafo sin datos reales de César; se agregan desde el panel.
