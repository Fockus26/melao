# D073 · Seguridad · Rutas protegidas: proxy optimista + chequeo por página; admin por `profiles` (RLS) y 404 sin rol · Implementado

**Decisión:** `proxy.ts` refresca la sesión (`getClaims`) en cada petición y redirige sin sesión
`/app/**` y `/admin/**` a `/entrar?next=<ruta>`, y con sesión `/entrar` y `/registro` a `next` o
`/app`. Cada página protegida repite el chequeo con `requireUser` / `requireAdmin`
(`lib/auth/session.ts`); el layout del admin también, para no pintar su menú. El rol sale de
`profiles.app_role` leído con la sesión del usuario (RLS), nunca de `user_metadata`. Sin rol
admin: `notFound()` (no revela que el panel existe). `next` pasa por `safeNext`: solo rutas
internas, sin `//`, `\`, controles ni pantallas de auth, y se revalida tras normalizar
(`/app/../..//evil.com` → `//evil.com` se rechaza).
**Por qué:** la guía de auth de Next 16 pide que el proxy sea solo optimista y que el chequeo
real vaya junto a los datos; un layout no se vuelve a evaluar al navegar.
**Alternativa descartada:** `forbidden()` (403): requiere `authInterrupts` experimental. Redirigir
al alumno sin rol a `/app`: le confirma que `/admin` existe.
