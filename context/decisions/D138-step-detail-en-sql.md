# D138 · Datos · Detalle de paso: `step_detail(p_style_id, p_slug)` en una lectura, estilo preferido si el slug se repite · Implementado

**Decisión:** `/app/steps/[slug]` pide una vez `public.step_detail(p_style_id, p_slug)` (`security
invoker`, `20261002160000_step_detail.sql`): a lo sumo una fila con el paso publicado de un estilo
publicado, sus posiciones, `free` (paso libre o estilo sin roles, D016), videos por rol, el rol de
la tarjeta (`private.card_role`), estado, favorito, `due_at`, relacionados (D139) e historial
(D140), los tres últimos en jsonb. El slug es único por estilo: si dos estilos lo tienen gana
`p_style_id` (`?style` si es publicado, si no el estilo actual) y, si ese estilo no lo tiene, el
del primer estilo por `sort_order`. Los enlaces a otros pasos llevan `?style=` solo si el paso que
se ve no es del estilo actual. Sin fila → 404.
**Por qué:** una sola llamada que Android/iOS repiten igual; las reglas (qué es libre, qué cuenta
como relacionado, de qué rol es la tarjeta, cuántos repasos) quedan en SQL (D003). Buscar el slug
en todos los estilos deja que "Lo que más te cuesta" y los relacionados enlacen sin `?style`.
**Alternativa descartada:** varias lecturas directas con el SDK (más idas y vueltas y la regla de
`free` y de la tarjeta repetida en cada cliente); `/app/steps/[style]/[slug]` (rompe los enlaces
existentes de #62–#64).
