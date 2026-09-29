# D081 · Producto · Sin Bienvenida hecha, `/app/*` desvía a `/welcome`; el destino tras entrar sigue siendo `/app` · Implementado

**Decisión:** reemplaza la parte de destino de D074. Tras entrar o registrarse se va a `next` o
a `/app`, como antes; cada página de `/app/*` exige la Bienvenida hecha
(`requireOnboardedUser`: `profiles.onboarded_at` null → `/welcome`). `/welcome` exige sesión
(y `/checkout` también, en `PROTECTED_PREFIXES`) y, con el onboarding hecho, manda a `/app`.
El resto de D074 (confirmación de correo, aviso de términos) sigue vigente.
**Por qué:** un solo punto de desvío vale igual para correo, Google, enlaces de correo y un
`next` a cualquier pantalla de la app, sin que cada formulario sepa del onboarding. Va en las
páginas y no en el layout, que no se vuelve a evaluar al navegar (D072).
**Alternativa descartada:** mandar a `/welcome` desde los formularios de registro: se salta si
el alumno entra por Google, por un enlace o con un `next`.
