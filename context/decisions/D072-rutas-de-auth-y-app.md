# D072 · Arquitectura · Auth en el grupo `(auth)` con PublicShell solo-logo; `/app` y `/admin` como carpetas reales con su shell · Implementado

**Decisión:** `/entrar`, `/registro`, `/recuperar` y `/restablecer` viven en `app/(auth)/`, con un
layout que monta `PublicShell header="account"` sin correo (solo el logo: sin los enlaces de la
landing, que distraen del formulario). `/app` y `/admin` son carpetas reales (`app/app/`,
`app/admin/`), no grupos, porque la URL ya lleva el prefijo; sus layouts montan `AppShell` y
`AdminShell`. `/app` es un Inicio **mínimo provisional** (saludo + cerrar sesión) y `/admin` un
panel provisional, hasta sus pantallas de 07b. `/auth/callback` y `/auth/salir` son Route Handlers.
**Por qué:** es la primera pantalla de cada grupo, que es cuando D060 dice crearlos; montar la
shell en el `layout.tsx` es una línea y las pantallas de 07b solo reemplazan `page.tsx`.
**Alternativa descartada:** grupo `(app)` con `app/(app)/app/`: no aporta nada con la URL ya
prefijada. Header de la landing en auth: dos llamadas a la acción que compiten con el formulario.
