-- Detalle de un paso (07b): lo que `/app/steps/[slug]` necesita en una sola lectura. Aditiva:
-- solo una función.
-- Contrato: docs/spec/api.md § Datos del alumno › Funciones. Decisiones: D003 (la regla vive
-- aquí, no en el cliente), D016 (paso libre: un video, sin rol), D038 (estado y favorito en
-- `user_steps`, tarjeta en `srs_cards`), D051 (rol `leader` en estilos sin roles), D127,
-- D138–D140.
--
-- `security invoker`: RLS decide lo visible (paso de un estilo publicado; un admin ve también
-- lo sin publicar, pero el detalle es la vista del alumno y exige paso y estilo publicados,
-- como `step_catalog`). Estado, favorito, tarjeta e historial son siempre los de `auth.uid()`,
-- nunca los de otro alumno aunque un admin los lea todos.

-- ── step_detail: un paso publicado por slug ─────────────────────────────────
-- A lo sumo una fila. El slug es único por estilo: si dos estilos publicados lo tienen, gana
-- `p_style_id` (el estilo actual del alumno); si no está ahí, el primero por `sort_order` del
-- estilo (D138). Sin paso publicado con ese slug, ninguna fila (la pantalla da 404).
--
-- * `free` (D016): paso libre (`category = 'libre'`) o estilo sin roles: un solo video, sin
--   segmentado de rol.
-- * `role`: el de la tarjeta del alumno en el estilo (`private.card_role`: `dance_role` del
--   perfil, o `leader` si el estilo no tiene roles); null si el perfil no tiene rol.
-- * `videos`: `[{ role, duration_ms, aspect, video_path, poster_path }]` por rol (`both` en un
--   paso libre); `[]` mientras no haya videos.
-- * `related` (D139): prerequisitos (`prerequisite`), el paso del que es variación (`base`) y
--   sus variaciones (`variation`), publicados y del mismo estilo, sin repetir un paso (gana la
--   primera relación en ese orden); dentro de cada relación, por `sort_order` y nombre.
-- * `history` (D140): los últimos 10 repasos de `auth.uid()` en el paso (todos los roles), del
--   más reciente al más antiguo: `[{ reviewed_at, rating, context, role }]`.

create function public.step_detail(p_style_id uuid, p_slug text)
returns table (
  step_id uuid,
  style_id uuid,
  slug text,
  name text,
  description text,
  category public.step_category,
  difficulty smallint,
  phrases smallint,
  beat_notes jsonb,
  free boolean,
  start_position text,
  end_position text,
  videos jsonb,
  role public.dance_role,
  status public.step_status,
  favorite boolean,
  due_at timestamptz,
  related jsonb,
  history jsonb
)
language sql stable
security invoker
set search_path = ''
as $$
  with s as (
    select st.*, ds.has_roles
    from public.steps st
    join public.dance_styles ds on ds.id = st.style_id
    where st.slug = p_slug
      and st.published
      and ds.published
    order by (st.style_id = p_style_id) desc, ds.sort_order, ds.name
    limit 1
  ),
  rel as (
    select distinct on (r.id)
      r.id, r.slug, r.name, r.category, r.sort_order, x.relation, x.rank
    from s
    cross join lateral (
      select p.requires_step_id as id, 'prerequisite' as relation, 1 as rank
        from public.step_prerequisites p where p.step_id = s.id
      union all
      select s.variation_of, 'base', 2 where s.variation_of is not null
      union all
      select v.id, 'variation', 3
        from public.steps v where v.variation_of = s.id and v.style_id = s.style_id
    ) x
    join public.steps r on r.id = x.id
    where r.published and r.style_id = s.style_id and r.id <> s.id
    order by r.id, x.rank
  )
  select
    s.id,
    s.style_id,
    s.slug,
    s.name,
    s.description,
    s.category,
    s.difficulty,
    s.phrases,
    s.beat_notes,
    (s.category = 'libre' or not s.has_roles),
    sp.name,
    ep.name,
    coalesce((
      select jsonb_agg(jsonb_build_object(
          'role', v.role, 'duration_ms', v.duration_ms, 'aspect', v.aspect,
          'video_path', v.video_path, 'poster_path', v.poster_path
        ) order by v.role)
      from public.step_videos v where v.step_id = s.id
    ), '[]'::jsonb),
    private.card_role((select auth.uid()), s.style_id),
    coalesce(us.status, 'unknown'::public.step_status),
    coalesce(us.favorite, false),
    c.due_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
          'step_id', rel.id, 'slug', rel.slug, 'name', rel.name,
          'category', rel.category, 'relation', rel.relation
        ) order by rel.rank, rel.sort_order, rel.name)
      from rel
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
          'reviewed_at', h.reviewed_at, 'rating', h.rating,
          'context', h.context, 'role', h.role
        ) order by h.reviewed_at desc)
      from (
        select r.reviewed_at, r.rating, r.context, r.role
        from public.step_reviews r
        where r.step_id = s.id and r.user_id = (select auth.uid())
        order by r.reviewed_at desc, r.id
        limit 10
      ) h
    ), '[]'::jsonb)
  from s
  join public.positions sp on sp.id = s.start_position_id
  join public.positions ep on ep.id = s.end_position_id
  left join public.user_steps us
    on us.step_id = s.id and us.user_id = (select auth.uid())
  left join public.srs_cards c
    on c.step_id = s.id
    and c.user_id = (select auth.uid())
    and c.role = private.card_role((select auth.uid()), s.style_id)
$$;

revoke execute on function public.step_detail(uuid, text) from public, anon;
grant execute on function public.step_detail(uuid, text) to authenticated, service_role;
