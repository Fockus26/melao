# D010 · Producto · Rejilla de beats por anclas; "1" marcado por el admin; BPM con librería MIT, no Essentia · Pendiente

**Decisión:** BPM y fase detectados automáticamente en el navegador (librería MIT, candidata
`web-audio-beat-detector`); el admin marca el primer "1" y añade anclas si la canción
acelera. La rejilla guarda anclas `{beat, tMs}` interpoladas linealmente.
**Por qué:** ningún detector sabe cuál beat es el "1" de la cuenta de baile; las
grabaciones en vivo cambian de tempo y un BPM único descuadra la cuenta.
**Alternativa descartada:** Essentia.js — licencia AGPL, incompatible con una app cerrada.
