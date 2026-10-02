-- Catálogo de pasos (07b): lo que `/app/steps` necesita por paso, con el estado y el favorito
-- del alumno y el próximo repaso de su rol. Aditiva: solo una función.
-- Contrato: docs/spec/api.md § Datos del alumno › Funciones. Decisiones: D003 (la regla vive
-- aquí, no en el cliente), D038 (estado y favorito en `user_steps`, tarjeta en `srs_cards`),
-- D051 (rol `leader` en estilos sin roles), D127.
--
-- `security invoker`: RLS decide lo visible (paso de un estilo publicado; un admin ve también
-- los sin publicar, pero el catálogo es el del alumno y solo lista los publicados, como
-- `due_steps`). Estado, favorito y tarjeta son siempre los de `auth.uid()`, nunca los de otro
-- alumno aunque un admin los lea todos.

-- ── step_catalog: los pasos publicados de un estilo ─────────────────────────
-- Una fila por paso publicado del estilo, agrupables por categoría: orden de la categoría (el
-- del enum `step_category`: base, vuelta, entrada, salida, figura, variacion, libre) y dentro,
-- el del admin (`sort_order`), luego nombre (D128). Sin fila en `user_steps`: `unknown` y no
-- favorito. `due_at`: la tarjeta del rol que le toca al alumno en el estilo
-- (`private.card_role`); null sin tarjeta (paso nunca repasado).

create function public.step_catalog(p_style_id uuid)
returns table (
  step_id uuid,
  slug text,
  name text,
  category public.step_category,
  difficulty smallint,
  status public.step_status,
  favorite boolean,
  due_at timestamptz
)
language sql stable
security invoker
set search_path = ''
as $$
  select
    s.id,
    s.slug,
    s.name,
    s.category,
    s.difficulty,
    coalesce(us.status, 'unknown'::public.step_status),
    coalesce(us.favorite, false),
    c.due_at
  from public.steps s
  left join public.user_steps us
    on us.step_id = s.id and us.user_id = (select auth.uid())
  left join public.srs_cards c
    on c.step_id = s.id
    and c.user_id = (select auth.uid())
    and c.role = private.card_role((select auth.uid()), p_style_id)
  where s.style_id = p_style_id
    and s.published
  order by s.category, s.sort_order, s.name, s.id
$$;

revoke execute on function public.step_catalog(uuid) from public, anon;
grant execute on function public.step_catalog(uuid) to authenticated, service_role;
