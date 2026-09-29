# D050 · Arquitectura · Escrituras de Edge Functions en funciones SQL `public.ef_*` solo para service_role · Pendiente

**Decisión:** cada Edge Function escribe en una sola llamada a una función SQL `security
definer` (una transacción), en el esquema `public` con prefijo `ef_` y `execute` revocado a
`public`/`anon`/`authenticated` y concedido solo a `service_role`. El alumno llega como
parámetro, resuelto del JWT por la Edge Function. Los errores de regla salen como
`raise exception '<código>'` y `_shared/sql-errors.ts` los traduce a HTTP.
**Por qué:** supabase-js no tiene transacciones y PostgREST solo expone los esquemas de la
API (`public`): una función en `private` no se puede llamar con `rpc()` sin exponer el
esquema entero. Con el grant, `anon`/`authenticated` reciben "permission denied" (probado en
`tests/unit/db-edge-functions.test.ts`). Además los tipos generados (`--schema public`) las
incluyen y `db-tipos.test.ts` vigila que no se desincronicen.
**Alternativa descartada:** funciones en `private` y agregar `private` a los esquemas
expuestos de la API (acción manual en el panel y expone también `private.is_admin()` y lo que
venga después); o una conexión directa a Postgres desde Deno (`SUPABASE_DB_URL`), que suma un
driver y un pool por función.
