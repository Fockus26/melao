# D134 · Auth · Cambio de correo con "Secure email change"; la vuelta termina siempre en Perfil con `?email=<resultado>` · Implementado

**Decisión:** Perfil cambia el correo con `updateUser({ email })` y `emailRedirectTo =
/auth/callback?type=email_change`. El callback reconoce el tipo y no usa `next`: termina en
`/app/profile?email=` con `changed`, `confirm-other` (primer enlace de los dos: vuelve sin código
y con `message`), `link-expired`, `other-browser` o `access-failed`. Plantilla
`supabase/templates/email_change.html` (sirve para el correo actual y el nuevo).
**Por qué:** César pidió el flujo de confirmación de Supabase. Con el cambio seguro el primer
enlace vuelve sin código: con el callback genérico caía en `/login?error=missing-code`. Perfil es
donde se pidió el cambio y donde se ve el pendiente (`user.new_email`).
**Alternativa descartada:** `next=/app/profile` por el camino genérico (no distingue el primer
enlace ni da mensajes propios); plantilla con `token_hash` (sirve en otro navegador, pero las
demás plantillas usan `{{ .ConfirmationURL }}`; el callback acepta las dos).
