# D129 · Datos · Favorito de un paso: update de `favorite`, si no hay fila insert, optimista y en fila por paso · Implementado

**Decisión:** `lib/steps/favorite.ts` (`saveStepFavorite`) deja `user_steps.favorite` así:
`update ... set favorite` de la fila propia; si no había fila y se marca, `insert (user_id,
step_id, favorite)`; si el insert choca con 23505 (otra pestaña la creó), `update` otra vez.
Desmarcar sin fila no escribe. `components/steps/step-favorite.tsx` (`useStepFavorites` +
`StepFavoriteButton`, corazón de 48 con `aria-pressed`) lo aplica optimista, en fila por paso
(gana el último toque), revierte y avisa si falla y manda a Entrar si la sesión venció. Lo
reutiliza el detalle del paso (ola 2).
**Por qué:** el cliente solo tiene grant de insert en `user_id, step_id, favorite` y de update en
`favorite` (D038); el upsert de PostgREST hace `do update set` de todas las columnas enviadas,
incluidas `user_id` y `step_id`, y lo rechaza el grant de columna.
**Alternativa descartada:** upsert (falla por el grant); ampliar el grant de update a `user_id,
step_id` (abre mover la fila a otro paso) o una función `security definer` para alternar (más
superficie para una escritura que RLS ya cubre).
