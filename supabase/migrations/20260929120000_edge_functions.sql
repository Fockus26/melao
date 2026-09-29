-- 07a·3 — Escrituras atómicas de las Edge Functions.
-- Contrato: docs/spec/api.md § Edge Functions, srs.md. Decisiones: D003, D013, D015, D049–D052.
--
-- supabase-js no tiene transacciones: cada Edge Function lee con una función y escribe con
-- otra, y cada una corre en una sola transacción de Postgres.
-- * En `public` (el único esquema que expone la API) con prefijo `ef_`, pero ejecutables
--   **solo** por service_role (D050): ni anon ni authenticated pueden llamarlas.
-- * security definer y search_path vacío, como las funciones de apoyo de RLS.
-- * El alumno llega como parámetro (`p_user`): lo resuelve la Edge Function desde el JWT,
--   nunca desde el cuerpo de la petición.
-- * Errores de regla: `raise exception '<código>'` (SQLSTATE P0001). La Edge Function traduce
--   el código a HTTP (`_shared/sql-errors.ts`).

-- ── activate-subscription ────────────────────────────────────────────────────
-- v1: proveedor `placeholder`, sin cobro (D015). El precio sale de `plans`, nunca del cliente.
-- Idempotente: con una activa del mismo plan la devuelve tal cual; con una activa de otro
-- plan responde `subscription_exists` (409, D049). Una "activa" con el período vencido se
-- marca `expired` y se crea una nueva (renovación).

create function public.ef_activate_subscription(p_user uuid, p_plan_slug text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_plan public.plans%rowtype;
  v_sub public.subscriptions%rowtype;
begin
  select * into v_plan from public.plans where slug = p_plan_slug and is_active;
  if not found then
    raise exception 'plan_not_found';
  end if;

  -- Serializa las activaciones del mismo alumno (doble clic, reintentos).
  perform 1 from public.profiles where id = p_user for update;
  if not found then
    raise exception 'user_not_found';
  end if;

  select * into v_sub from public.subscriptions
  where user_id = p_user and status in ('active', 'past_due');

  if found and v_sub.current_period_end <= now() then
    update public.subscriptions set status = 'expired' where id = v_sub.id;
    found := false;
  end if;

  if found then
    if v_sub.plan_id <> v_plan.id then
      raise exception 'subscription_exists';
    end if;
  else
    insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
    values (
      p_user, v_plan.id, 'active', 'placeholder', now(),
      now() + case v_plan.billing_interval when 'year' then interval '1 year' else interval '1 month' end
    )
    returning * into v_sub;
  end if;

  return jsonb_build_object(
    'plan', v_plan.slug,
    'status', v_sub.status,
    'currentPeriodEnd', v_sub.current_period_end,
    'priceCents', v_plan.price_cents,
    'currency', v_plan.currency,
    'billingInterval', v_plan.billing_interval
  );
end
$$;

-- ── review-steps: lectura ────────────────────────────────────────────────────
-- Lo que el core necesita para calcular: suscripción, rol del perfil, pasos (con has_roles
-- del estilo y el estado del catálogo) y las tarjetas actuales. Solo pasos que existen.

create function public.ef_review_state(p_user uuid, p_step_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'activeSubscription', exists (
      select 1 from public.subscriptions
      where user_id = p_user and status = 'active' and current_period_end > now()
    ),
    'profileRole', (select dance_role from public.profiles where id = p_user),
    'steps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'hasRoles', ds.has_roles,
        'status', coalesce(us.status, 'unknown')
      ) order by s.id)
      from public.steps s
      join public.dance_styles ds on ds.id = s.style_id
      left join public.user_steps us on us.user_id = p_user and us.step_id = s.id
      where s.id = any (p_step_ids)
    ), '[]'::jsonb),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'step_id', c.step_id,
        'role', c.role,
        'state', c.state,
        'stability', c.stability,
        'difficulty', c.difficulty,
        'due_at', c.due_at,
        'last_review_at', c.last_review_at,
        'reps', c.reps,
        'lapses', c.lapses
      ) order by c.step_id, c.role)
      from public.srs_cards c
      where c.user_id = p_user and c.step_id = any (p_step_ids)
    ), '[]'::jsonb)
  )
$$;

-- ── review-steps: escritura ──────────────────────────────────────────────────
-- La Edge Function manda lo ya calculado por el core (srs.ts): cada repaso trae su fila de
-- step_reviews y la tarjeta siguiente. Aquí, en una transacción:
-- 1. Suscripción activa, sesión del alumno, lección y pasos existentes.
-- 2. `reviews`: inserta en step_reviews con `on conflict (session_id, step_id, role) do
--    nothing` y guarda la tarjeta **solo** de las filas insertadas (reenviar no recalcula).
--    El paso sube a `learning` en el catálogo si estaba en `unknown`.
-- 3. `status` (catálogo, srs.md): `known` = repaso Good + tarjeta (se salta si ya estaba en
--    `known`); `learning` = tarjeta nueva si no había; `unknown` = sin tarjeta (se borran
--    las del paso; el historial de step_reviews queda).
-- 4. `context = lesson` con `lessonId`: registra lesson_progress si la sesión es la práctica
--    final de esa lección (su canción es `final_song_id`, o la lección no fija una).
-- Devuelve las tarjetas de todos los pasos tocados.
--
-- p_payload:
-- { context, sessionId, lessonId,
--   reviews: [{ stepId, role, rating, reviewedAt, dueAfter, card }],
--   status:  [{ stepId, status, role, review?: { rating, reviewedAt, dueAfter }, card? }] }
-- `card` = columnas de srs_cards sin claves (D043).

create function public.ef_review_steps(p_user uuid, p_payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_context public.review_context := (p_payload ->> 'context')::public.review_context;
  v_session uuid := (p_payload ->> 'sessionId')::uuid;
  v_lesson uuid := (p_payload ->> 'lessonId')::uuid;
  v_session_row public.practice_sessions%rowtype;
  v_final_song uuid;
  v_step_ids uuid[];
  v_found integer;
begin
  if not exists (
    select 1 from public.subscriptions
    where user_id = p_user and status = 'active' and current_period_end > now()
  ) then
    raise exception 'no_active_subscription';
  end if;

  if v_session is not null then
    select * into v_session_row from public.practice_sessions where id = v_session;
    -- La sesión de otro alumno responde igual que una inexistente: no se revela.
    if not found or v_session_row.user_id <> p_user then
      raise exception 'session_not_found';
    end if;
  end if;

  if v_lesson is not null then
    select final_song_id into v_final_song from public.lessons where id = v_lesson;
    if not found then
      raise exception 'lesson_not_found';
    end if;
    if v_session is not null and v_session_row.lesson_id is distinct from v_lesson then
      raise exception 'session_lesson_mismatch';
    end if;
  end if;

  -- Tablas de trabajo de esta llamada (se borran al terminar la transacción).
  drop table if exists pg_temp.ef_reviews, pg_temp.ef_status;
  create temporary table ef_reviews on commit drop as
  select r."stepId" as step_id, r.role, r.rating, r."reviewedAt" as reviewed_at,
         r."dueAfter" as due_after, r.card
  from jsonb_to_recordset(coalesce(p_payload -> 'reviews', '[]'::jsonb)) as r(
    "stepId" uuid, role public.dance_role, rating smallint, "reviewedAt" timestamptz,
    "dueAfter" timestamptz, card jsonb
  );

  create temporary table ef_status on commit drop as
  select s."stepId" as step_id, s.status, s.role, s.review, s.card
  from jsonb_to_recordset(coalesce(p_payload -> 'status', '[]'::jsonb)) as s(
    "stepId" uuid, status public.step_status, role public.dance_role, review jsonb, card jsonb
  );

  select array_agg(distinct step_id) into v_step_ids
  from (select step_id from ef_reviews union all select step_id from ef_status) t;
  v_step_ids := coalesce(v_step_ids, '{}');

  select count(*) into v_found from public.steps where id = any (v_step_ids);
  if v_found <> cardinality(v_step_ids) then
    raise exception 'step_not_found';
  end if;

  -- Estilos sin roles (merengue): una sola tarjeta por paso, con rol canónico `leader` (D051).
  if exists (
    select 1
    from (select step_id, role from ef_reviews union all select step_id, role from ef_status) t
    join public.steps s on s.id = t.step_id
    join public.dance_styles ds on ds.id = s.style_id
    where not ds.has_roles and t.role is distinct from 'leader'
  ) then
    raise exception 'invalid_role';
  end if;

  -- 2. Repasos.
  with ins as (
    insert into public.step_reviews (user_id, step_id, role, rating, context, session_id, lesson_id, reviewed_at, due_after)
    select p_user, step_id, role, rating, v_context, v_session, v_lesson, reviewed_at, due_after
    from ef_reviews
    on conflict (session_id, step_id, role) do nothing
    returning step_id, role
  ), cards as (
    insert into public.srs_cards (user_id, step_id, role, state, stability, difficulty, due_at, last_review_at, reps, lapses)
    select p_user, r.step_id, r.role,
           (r.card ->> 'state')::public.card_state,
           (r.card ->> 'stability')::double precision,
           (r.card ->> 'difficulty')::double precision,
           (r.card ->> 'due_at')::timestamptz,
           (r.card ->> 'last_review_at')::timestamptz,
           (r.card ->> 'reps')::integer,
           (r.card ->> 'lapses')::integer
    from ef_reviews r
    join ins using (step_id, role)
    on conflict (user_id, step_id, role) do update set
      state = excluded.state,
      stability = excluded.stability,
      difficulty = excluded.difficulty,
      due_at = excluded.due_at,
      last_review_at = excluded.last_review_at,
      reps = excluded.reps,
      lapses = excluded.lapses
    returning step_id
  )
  insert into public.user_steps (user_id, step_id, status)
  select distinct p_user, step_id, 'learning'::public.step_status from cards
  on conflict (user_id, step_id) do update set status = 'learning'
  where public.user_steps.status = 'unknown';

  -- 3. Estado del catálogo. `known` que ya lo era: no hace nada (idempotente).
  delete from ef_status s
  using public.user_steps us
  where s.status = 'known' and us.user_id = p_user and us.step_id = s.step_id
    and us.status = 'known';

  with ins as (
    insert into public.step_reviews (user_id, step_id, role, rating, context, session_id, lesson_id, reviewed_at, due_after)
    select p_user, step_id, role, (review ->> 'rating')::smallint, v_context, v_session, v_lesson,
           (review ->> 'reviewedAt')::timestamptz, (review ->> 'dueAfter')::timestamptz
    from ef_status
    where status = 'known'
    on conflict (session_id, step_id, role) do nothing
    returning step_id, role
  )
  insert into public.srs_cards (user_id, step_id, role, state, stability, difficulty, due_at, last_review_at, reps, lapses)
  select p_user, s.step_id, s.role,
         (s.card ->> 'state')::public.card_state,
         (s.card ->> 'stability')::double precision,
         (s.card ->> 'difficulty')::double precision,
         (s.card ->> 'due_at')::timestamptz,
         (s.card ->> 'last_review_at')::timestamptz,
         (s.card ->> 'reps')::integer,
         (s.card ->> 'lapses')::integer
  from ef_status s
  join ins using (step_id, role)
  on conflict (user_id, step_id, role) do update set
    state = excluded.state,
    stability = excluded.stability,
    difficulty = excluded.difficulty,
    due_at = excluded.due_at,
    last_review_at = excluded.last_review_at,
    reps = excluded.reps,
    lapses = excluded.lapses;

  -- "Aprendiendo": tarjeta nueva solo si no había; una existente no se reinicia.
  insert into public.srs_cards (user_id, step_id, role, state, stability, difficulty, due_at, last_review_at, reps, lapses)
  select p_user, step_id, role,
         (card ->> 'state')::public.card_state,
         (card ->> 'stability')::double precision,
         (card ->> 'difficulty')::double precision,
         (card ->> 'due_at')::timestamptz,
         (card ->> 'last_review_at')::timestamptz,
         (card ->> 'reps')::integer,
         (card ->> 'lapses')::integer
  from ef_status
  where status = 'learning'
  on conflict (user_id, step_id, role) do nothing;

  -- "No me lo sé": sin tarjeta activa (de ningún rol); el historial queda.
  delete from public.srs_cards c
  using ef_status s
  where s.status = 'unknown' and c.user_id = p_user and c.step_id = s.step_id;

  insert into public.user_steps (user_id, step_id, status)
  select distinct on (step_id) p_user, step_id, status from ef_status
  order by step_id
  on conflict (user_id, step_id) do update set status = excluded.status;

  -- 4. Práctica final de una lección → desbloquea la siguiente.
  if v_context = 'lesson' and v_lesson is not null and v_session is not null
     and exists (select 1 from ef_reviews)
     and (v_final_song is null or v_session_row.song_id = v_final_song) then
    insert into public.lesson_progress (user_id, lesson_id)
    values (p_user, v_lesson)
    on conflict (user_id, lesson_id) do nothing;
  end if;

  return jsonb_build_object('cards', coalesce((
    select jsonb_agg(jsonb_build_object(
      'stepId', c.step_id,
      'role', c.role,
      'dueAt', c.due_at,
      'state', c.state
    ) order by c.step_id, c.role)
    from public.srs_cards c
    where c.user_id = p_user and c.step_id = any (v_step_ids)
  ), '[]'::jsonb));
end
$$;

-- ── Permisos: solo service_role (las Edge Functions) ─────────────────────────

revoke execute on function
  public.ef_activate_subscription(uuid, text),
  public.ef_review_state(uuid, uuid[]),
  public.ef_review_steps(uuid, jsonb)
from public, anon, authenticated;

grant execute on function
  public.ef_activate_subscription(uuid, text),
  public.ef_review_state(uuid, uuid[]),
  public.ef_review_steps(uuid, jsonb)
to service_role;
