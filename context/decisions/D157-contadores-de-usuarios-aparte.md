# D157 · Técnica · Los contadores de los chips de Usuarios salen de una función aparte, con la búsqueda y sin el filtro de estado · Implementado

**Decisión:** `public.admin_user_counts(p_query)` devuelve una fila con `all_count` y un
contador por estado (`active, past_due, canceled, expired, none`) para la búsqueda puesta,
sin aplicar el estado elegido. Comparte con `admin_users` la base privada
`private.admin_user_rows(p_query)` (sin grants: solo la llaman las dos funciones, después de
comprobar el rol). La web pide página y contadores en paralelo; el total de la paginación es el
contador del chip elegido, y el del encabezado es `all_count` sin búsqueda.
**Por qué:** los chips muestran su número aunque la página filtrada venga vacía; con una
columna por ventana en `admin_users` esos números se pierden justo cuando no hay filas.
**Alternativa descartada:** contadores por ventana repetidos en cada fila de `admin_users`
(una llamada menos, pero vacíos sin resultados) o contar en el cliente (exige traer todos los
usuarios).
