# D101 · Auth · `other-browser` se parte en `other-browser-signup` y `other-browser-recovery` según el tipo de enlace · Implementado

**Decisión:** cuando el callback no encuentra el verificador PKCE (enlace abierto en otro
navegador), el motivo depende del tipo de enlace: recuperación (`type=recovery` o
`next=/reset-password`) → `other-browser-recovery` a `/forgot-password` ("pide uno nuevo aquí");
lo demás → `other-browser-signup` a `/login` ("tu correo ya quedó confirmado, entra"). Cada uno
muestra una sola frase. `other-browser` queda como alias del de confirmación (enlaces ya
enviados). Pura en `callbackErrorReason(code, { recovering })` y `callbackFailurePath`.
**Por qué:** el texto único mezclaba los dos casos ("Si confirmabas… Si cambiabas…") y obligaba
a adivinar. El callback ya sabe si es recuperación por `next`, sin señal nueva.
**Alternativa descartada:** agregar `flow=signup` al `emailRedirectTo` del registro: no hace
falta (todo lo que no es recuperación cae en confirmación; Google con PKCE no se abre en otro
navegador) y obligaba a cambiar la URL de vuelta en las tres plataformas.
