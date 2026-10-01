# D123 · Producto · "Terminar" siempre visible al pie de la sesión; con borde mientras suena, blanco al acabar la canción; sin salto automático · Implementado

**Decisión:** debajo de los controles, un botón "Terminar" a lo ancho que lleva a
`/app/practice/result?id=<sessionId>` (calificar). Mientras suena va con borde (secundario);
cuando la canción termina pasa a blanco (principal) y los controles ofrecen "Empezar de nuevo".
Al terminar la música no se navega solo. La X (con confirmación) sale a `/app/practice` sin
calificar.
**Por qué:** el contrato pide llegar al resultado al terminar o con "Terminar"; un salto
automático pelea con "Empezar de nuevo" y quita el control al alumno. Un botón blanco grande
bajo "Pausa" mientras baila invita a un toque sin querer que acaba la sesión sin confirmar.
Igual que la lección (D098, "Continuar" siempre visible).
**Alternativa descartada:** ir al resultado sola al acabar la canción; mostrar "Terminar" solo al
final (no deja terminar antes y calificar lo practicado).
