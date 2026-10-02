# D127 · Datos · Catálogo de pasos: `step_catalog(p_style_id)` con estado, favorito y repaso del rol, solo publicados · Implementado

**Decisión:** `/app/steps` pide una vez `public.step_catalog(p_style_id)` (`security invoker`,
`20261002120000_step_catalog.sql`): una fila por paso **publicado** del estilo con `step_id, slug,
name, category, difficulty`, `status` (`unknown` sin fila en `user_steps`), `favorite` (false sin
fila) y `due_at` de la tarjeta del rol que le toca en el estilo (`private.card_role`: el del
perfil, o `leader` sin roles; null sin tarjeta). Estado, favorito y tarjeta son siempre los de
`auth.uid()`. El admin también ve solo los publicados (como `due_steps` y `course_path`).
**Por qué:** el estado efectivo y el rol de la tarjeta son reglas (D003, D038, D051): Android/iOS
llaman la misma función en vez de rearmar tres lecturas y un `left join`. Solo publicados: el
catálogo es el del alumno; el admin revisa lo sin publicar en su panel.
**Alternativa descartada:** leer `steps`, `user_steps` y `srs_cards` desde el cliente y unir en TS
(la regla del rol y del "sin fila = no lo sé" se repetiría en cada plataforma); que el admin vea
los sin publicar (mezclaría su vista de alumno con su borrador).
