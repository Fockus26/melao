# D052 · Arquitectura · Edge Functions: handler.ts con puertos, index.ts mínimo tipado vía runtime.ts, validación a mano · Pendiente

**Decisión:** por función, `handler.ts` (lógica; recibe auth, datos y reloj como puertos),
`supabase.ts` (puerto con supabase-js) e `index.ts` (cliente + `Deno.serve`). Los `index.ts`
**no** se excluyen del `tsconfig`: usan `_shared/runtime.ts`, que declara solo lo que usan de
Deno (`serve`, `env.get`) leyendo `globalThis.Deno`. Validación de entrada a mano en
`_shared/validate.ts` (sin librería). La clave de servicio sale de `SUPABASE_SECRET_KEYS.default`
con respaldo en `SUPABASE_SERVICE_ROLE_KEY`.
**Por qué:** sin Deno ni Docker en la máquina, lo único verificable es `tsc` y `bun test`: así
todo el código de las funciones pasa por el typecheck y la lógica se prueba desde bun. Las
entradas son pocas y planas; una librería (zod, valibot) suma una dependencia más a fijar en
dos import maps. El proyecto usa las claves nuevas (`SUPABASE_SECRET_KEY` en `.env.example`).
**Alternativa descartada:** excluir `supabase/functions/*/index.ts` del `tsconfig` (quedarían
sin ningún chequeo) o `declare const Deno` en cada `index.ts` (repetido).
