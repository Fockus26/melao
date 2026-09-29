# D018 · Arquitectura · Tokens en design/tokens.json (Style Dictionary) y textos en messages/es.json · Pendiente

**Decisión:** tokens en `design/tokens.json` (W3C Design Tokens; Style Dictionary genera el
CSS). Textos de UI en `messages/es.json` (next-intl, un idioma).
**Por qué:** Compose y SwiftUI generan su tema del mismo JSON; los textos pasan a
`strings.xml` / `Localizable` sin reescribirlos.
**Alternativa descartada:** tokens solo en `globals.css` y textos literales en componentes.
**Estado (detalle):** Pendiente (verificar Style Dictionary y next-intl con Context7 al implementar)
