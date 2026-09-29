# D037 · Arquitectura · Migraciones probadas con PGlite + stub de Supabase en bun test; César las aplica con db push · Implementado

**Decisión:** las migraciones de `supabase/migrations/` se prueban en `bun test` sobre PGlite
(Postgres en proceso) con un stub mínimo de Supabase (`tests/db/supabase-stub.sql`: roles
`anon`/`authenticated`/`service_role`, `auth.users`, `auth.uid()`, permisos por defecto de
`public`). Cada regla de acceso tiene su test como anónimo, alumno y admin (`tests/db/harness.ts`).
Las migraciones se escriben en el PR y César las aplica al proyecto después del merge
(`supabase db push`); nunca se aplican vía MCP.
**Por qué:** César no tiene Docker (sin `supabase start`); PGlite corre igual en local y en CI.
**Límite:** no es Supabase completo: Auth, Storage y PostgREST quedan fuera; si se agrega una
dependencia del esquema de Supabase, se agrega al stub.
**Alternativa descartada:** Docker Desktop (instalación pesada, no corre en CI tal cual);
migraciones sin probar (los errores aparecerían en el proyecto real).
