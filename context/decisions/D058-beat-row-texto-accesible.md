# D058 · Componentes · BeatRow como lista <ol> con aria-current en el tiempo activo, sin aria-live · Implementado

**Decisión:** la tira de tiempos es un `<ol>` con nombre ("Tiempos de la frase"); cada tiempo
es un `<li>` con su número en texto, el activo con `aria-current="true"` y los silenciosos con
"·" oculto + texto "4, en silencio". No hay región viva: el cambio de tiempo no se anuncia.
El activo se distingue por forma (barra de 8 px de alto en vez de 4) y color (blanco 600).
**Por qué:** a 184 BPM hay más de 3 tiempos por segundo; anunciarlos taparía al coach, que es el
canal del ritmo. La lista deja consultar la tira (qué tiempos se cuentan, cuál suena) sin ruido.
**Alternativa descartada:** `aria-live="polite"` con el tiempo actual (ruido constante);
`aria-hidden` en toda la tira (se pierde qué tiempos son silenciosos).
