-- Inicio y Curso (07b): lecturas con reglas que cada cliente (web, Android, iOS) llama igual.
-- Aditiva: solo funciones. Contrato: docs/spec/api.md § Datos del alumno › Funciones.
-- Decisiones: D003 (la regla vive aquí, no en el cliente), D023 (un rol para todos los
-- estilos), D051 (estilo sin roles → tarjeta `leader`), D092 (estados del camino), D093 (qué
-- paso "cuesta más").
--
-- Todas `security invoker`: corren con los permisos de quien llama, así que RLS decide lo
-- visible (contenido publicado; datos del alumno, solo los suyos). El alumno sale siempre de
-- `auth.uid()`, nunca de un parámetro.

-- ── Regla de desbloqueo (lineal) ─────────────────────────────────────────────
-- Una lección está desbloqueada si es la primera del curso o si el alumno completó la
-- anterior o ella misma. Es la misma regla de `ef_plan_session_state`
-- (20260929180000_plan_session.sql), que se deja como está.

create function private.lesson_unlocked(p_user uuid, p_lesson uuid) returns boolean
language sql stable
security invoker
set search_path = ''
as $$
  with ordered as (
    select l.id, lag(l.id) over (order by u.position, l.position) as prev
    from public.lessons l
    join public.course_units u on u.id = l.unit_id
    where u.course_id = (
      select u0.course_id from public.lessons l0
      join public.course_units u0 on u0.id = l0.unit_id
      where l0.id = p_lesson
    )
  )
  select coalesce((
    select o.prev is null or exists (
      select 1 from public.lesson_progress lp
      where lp.user_id = p_user and lp.lesson_id in (o.prev, o.id)
    )
    from ordered o where o.id = p_lesson
  ), false)
$$;

revoke execute on function private.lesson_unlocked(uuid, uuid) from public;
grant execute on function private.lesson_unlocked(uuid, uuid) to authenticated, service_role;

-- ── Rol de las tarjetas del alumno en un estilo ──────────────────────────────
-- `srs_cards` es por (paso, rol): el del perfil (D023) o `leader` si el estilo no tiene roles
-- (D051, como lo guarda review-steps).

create function private.card_role(p_user uuid, p_style_id uuid) returns public.dance_role
language sql stable
security invoker
set search_path = ''
as $$
  select case when ds.has_roles then p.dance_role else 'leader'::public.dance_role end
  from public.dance_styles ds, public.profiles p
  where ds.id = p_style_id and p.id = p_user
$$;

revoke execute on function private.card_role(uuid, uuid) from public;
grant execute on function private.card_role(uuid, uuid) to authenticated, service_role;

-- ── course_path: el camino del curso publicado de un estilo ─────────────────
-- Una fila por lección, en orden de unidad y posición. `status` (D092):
-- * `completed`: tiene `lesson_progress` (se puede repetir).
-- * `current`: la primera no completada (siempre desbloqueada).
-- * `available`: desbloqueada y no completada, pero no la primera (solo con huecos, p. ej.
--   una lección que el alumno completó saltándose otra).
-- * `locked`: el resto.
-- Curso o estilo sin publicar: ninguna fila (también para un admin: es la vista del alumno).

create function public.course_path(p_style_id uuid)
returns table (
  course_id uuid,
  unit_id uuid,
  unit_position smallint,
  unit_title text,
  lesson_id uuid,
  lesson_position smallint,
  lesson_number integer,
  lesson_title text,
  step_count integer,
  status text,
  lesson_count integer
)
language sql stable
security invoker
set search_path = ''
as $$
  with lessons as (
    select
      c.id as course_id,
      u.id as unit_id,
      u.position as unit_position,
      u.title as unit_title,
      l.id as lesson_id,
      l.position as lesson_position,
      (row_number() over (order by u.position, l.position))::integer as lesson_number,
      l.title as lesson_title,
      (select count(*) from public.lesson_steps ls where ls.lesson_id = l.id)::integer
        as step_count,
      exists (
        select 1 from public.lesson_progress lp
        where lp.user_id = (select auth.uid()) and lp.lesson_id = l.id
      ) as completed,
      (count(*) over ())::integer as lesson_count
    from public.courses c
    join public.dance_styles ds on ds.id = c.style_id
    join public.course_units u on u.course_id = c.id
    join public.lessons l on l.unit_id = u.id
    where c.style_id = p_style_id and c.published and ds.published
  ),
  first_open as (
    select min(lesson_number) as n from lessons where not completed
  )
  select
    l.course_id, l.unit_id, l.unit_position, l.unit_title, l.lesson_id, l.lesson_position,
    l.lesson_number, l.lesson_title, l.step_count,
    case
      when l.completed then 'completed'
      when l.lesson_number = (select n from first_open) then 'current'
      when private.lesson_unlocked((select auth.uid()), l.lesson_id) then 'available'
      else 'locked'
    end,
    l.lesson_count
  from lessons l
  order by l.lesson_number
$$;

-- ── style_progress: estilos publicados con el avance del alumno ──────────────
-- Para el selector de estilo (Sheet "Elige tu estilo"): todos los estilos publicados, los
-- elegidos en la Bienvenida marcados, y cuántas lecciones del curso publicado completó.

create function public.style_progress()
returns table (
  style_id uuid,
  name text,
  has_roles boolean,
  chosen boolean,
  has_course boolean,
  lesson_count integer,
  completed_count integer
)
language sql stable
security invoker
set search_path = ''
as $$
  select
    ds.id,
    ds.name,
    ds.has_roles,
    exists (
      select 1 from public.user_styles us
      where us.user_id = (select auth.uid()) and us.style_id = ds.id
    ),
    c.id is not null,
    coalesce((
      select count(*) from public.lessons l
      join public.course_units u on u.id = l.unit_id
      where u.course_id = c.id
    ), 0)::integer,
    coalesce((
      select count(*) from public.lesson_progress lp
      join public.lessons l on l.id = lp.lesson_id
      join public.course_units u on u.id = l.unit_id
      where u.course_id = c.id and lp.user_id = (select auth.uid())
    ), 0)::integer
  from public.dance_styles ds
  left join public.courses c on c.style_id = ds.id and c.published
  where ds.published
  order by ds.sort_order, ds.name
$$;

-- ── due_steps: pasos por repasar hoy ─────────────────────────────────────────
-- Tarjetas del alumno con `due_at <= now()`, del rol que le toca en ese estilo, de pasos
-- visibles. Las más atrasadas primero.

create function public.due_steps(p_style_id uuid)
returns table (step_id uuid, slug text, name text, due_at timestamptz)
language sql stable
security invoker
set search_path = ''
as $$
  select s.id, s.slug, s.name, c.due_at
  from public.srs_cards c
  join public.steps s on s.id = c.step_id
  where c.user_id = (select auth.uid())
    and s.style_id = p_style_id
    and s.published
    and c.role = private.card_role((select auth.uid()), p_style_id)
    and c.due_at <= now()
  order by c.due_at, s.sort_order, s.name
$$;

-- ── hardest_steps: lo que más le cuesta al alumno (D093) ────────────────────
-- Pasos con tarjeta del rol del alumno cuya última calificación fue 1–2 (Otra vez, Difícil)
-- o que ya se le olvidaron alguna vez (`lapses > 0`). Orden: última calificación más baja,
-- más olvidos, mayor dificultad FSRS de la tarjeta y lo más reciente primero.

create function public.hardest_steps(p_style_id uuid, p_limit integer default 3)
returns table (
  step_id uuid,
  slug text,
  name text,
  difficulty smallint,
  last_rating smallint,
  last_reviewed_at timestamptz,
  lapses integer
)
language sql stable
security invoker
set search_path = ''
as $$
  select s.id, s.slug, s.name, s.difficulty, r.rating, r.reviewed_at, c.lapses
  from public.srs_cards c
  join public.steps s on s.id = c.step_id
  cross join lateral (
    select sr.rating, sr.reviewed_at from public.step_reviews sr
    where sr.user_id = c.user_id and sr.step_id = c.step_id and sr.role = c.role
    order by sr.reviewed_at desc
    limit 1
  ) r
  where c.user_id = (select auth.uid())
    and s.style_id = p_style_id
    and s.published
    and c.role = private.card_role((select auth.uid()), p_style_id)
    and (r.rating <= 2 or c.lapses > 0)
  order by r.rating, c.lapses desc, c.difficulty desc, r.reviewed_at desc, s.name
  limit greatest(0, least(coalesce(p_limit, 3), 20))
$$;

-- ── Permisos: alumno y admin; anónimo no ────────────────────────────────────

revoke execute on function
  public.course_path(uuid), public.style_progress(), public.due_steps(uuid),
  public.hardest_steps(uuid, integer)
  from public, anon;
grant execute on function
  public.course_path(uuid), public.style_progress(), public.due_steps(uuid),
  public.hardest_steps(uuid, integer)
  to authenticated;
