# D041 · Producto · Orden de eventos por beat (stepStart, call, count, end); un stepStart por elemento del plan · Implementado

**Decisión:** los eventos van por `beat` (y por tanto por `tMs`); en el mismo beat, `stepStart`,
`call`, `count`, `end`. Hay un `stepStart` por cada elemento del plan, también cuando repite el
paso anterior (sin anuncio). `stepId` es el paso en curso en `count`/`stepStart`, el anunciado
en `call` y `null` en la entrada y en `end`. Con `leadInPhrases = 0` no hay entrada ni anuncio
del primer paso.
**Por qué:** un orden total hace los vectores comparables elemento a elemento; `stepStart`
primero deja a la UI cambiar de paso antes de pintar el "1". Marcar cada repetición permite
mostrar "×2" sin reconstruir el plan en el cliente.
**Alternativa descartada:** ordenar solo por `tMs` (empates sin orden definido entre
plataformas); un `stepStart` solo al cambiar de paso (la UI no sabría cuándo empieza la
repetición).
