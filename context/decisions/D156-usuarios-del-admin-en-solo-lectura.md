# D156 · Técnica · Usuarios del admin: una función `security definer` que lista, busca, filtra y pagina en Postgres, con el estado de `my_subscription` · Implementado

**Decisión:** `/admin/users` lee `public.admin_users(p_query, p_state, p_limit, p_offset)`
(`20261003140000_admin_users.sql`): `security definer` porque el correo y el último acceso
están en `auth.users`, con `private.is_admin()` al principio (`42501`), `search_path` vacío y
sin permiso para anónimo. Búsqueda, filtro por estado, orden (alta más reciente primero) y
página se resuelven en la base, con `total_count` por ventana; la web pagina de 25 en 25 con
la URL como estado (`?q=&state=&page=`). El estado de la suscripción sale de
`private.subscription_state(status, current_period_end)`, que ahora usa también
`my_subscription()` (mismo resultado, su test intacto): una sola regla para Perfil y Admin.
Sin suscripción, `none`. Búsqueda sin acentos con `translate` (las migraciones no activan
`unaccent`). Solo lectura: cambiar el rol sigue siendo `set_app_role`, fuera de esta pantalla.
**Por qué:** la lista crece con los alumnos (paginar en el cliente no escala) y el correo no
se puede leer con RLS; D003 deja la regla del estado en un solo lugar para Android e iOS.
**Alternativa descartada:** vista con `auth.users` expuesta por PostgREST (abre el esquema
auth a la API) o paginar en el cliente sobre toda la lista (D128 vale para 80 pasos, no para
miles de usuarios). `unaccent`: requiere activar la extensión en el proyecto; se puede cambiar
dentro de `private.search_text` sin tocar el contrato.
