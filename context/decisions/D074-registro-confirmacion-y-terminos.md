# D074 · Producto · Tras registrarse, a `/app`; confirmación de correo soportada con o sin ella; términos por aviso, sin casilla · Implementado

**Decisión:** el destino tras entrar o registrarse es `next` o `/app` (aún no hay
`/bienvenida`; cuando llegue, el registro lleva ahí). El registro funciona con la confirmación
de correo activa (sin sesión: estado "Revisa tu correo", el enlace vuelve por `/auth/callback`)
o inactiva (sesión inmediata → `/app`); la decide la configuración del proyecto. La aceptación
de términos es un aviso bajo el formulario ("Al crear tu cuenta aceptas los Términos y la
Política de privacidad"), que vale igual para Google.
**Por qué:** no se pudo leer la configuración de Auth del proyecto real sin tocarlo; soportar
los dos modos no cuesta nada. No hay primitivo Checkbox todavía y una casilla no cubre el alta
con Google (que no pasa por el formulario).
**Alternativa descartada:** casilla obligatoria (spec original): exige crear el primitivo y un
paso extra antes de Google. Si César la quiere, el CTA ya se deshabilita hasta cumplir y es
sumar una condición.
