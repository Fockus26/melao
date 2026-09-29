-- 07a·4 — plan-session: lectura del estado y registro atómico de la sesión.
-- Contrato: docs/spec/api.md § plan-session, motor-de-ritmo.md, combinaciones.md.
-- Decisiones: D003, D050 (funciones `public.ef_*` solo para service_role), D063–D066.
--
-- Mismo patrón que 20260929120000_edge_functions.sql: la Edge Function lee con una función,
-- calcula con el core (generatePlan + buildTimeline) y escribe con otra. security definer,
-- search_path vacío; el alumno llega como parámetro (`p_user`), resuelto desde el JWT.

-- ── plan-session: lectura ────────────────────────────────────────────────────
-- Hechos en bruto; las reglas (visibilidad para alumno o admin, lección bloqueada, filtros,
-- targets) las aplica el handler (plan-session/handler.ts) para poder probarlas con un
-- puerto falso. Devuelve `null` en style/song/lesson si no existen.
--
-- * style: configuración del motor (motor-de-ritmo §1) y posición inicial.
-- * song: rejilla y dance_end_ms; `visible` = publicada con licencia vigente (como
--   private.song_visible); `inStyle` = está en song_styles de ese estilo.
-- * lesson: estilo del curso, visibilidad (curso y estilo publicados), `unlocked` (es la
--   primera del curso, la anterior está completada o ella misma lo está; D063), canción y
--   frases de la mini práctica, sus pasos en orden y los de las lecciones anteriores.
-- * steps: todos los pasos del estilo (orden: sort_order, slug) con el estado del alumno,
--   favorito, su tarjeta FSRS del rol que corresponde (D065) y el percentil de popularidad.

create function public.ef_plan_session_state(
  p_user uuid, p_style uuid, p_song uuid, p_lesson uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_style public.dance_styles%rowtype;
  v_profile_role public.dance_role;
  v_card_role public.dance_role;
  v_course uuid;
begin
  select dance_role into v_profile_role from public.profiles where id = p_user;
  select * into v_style from public.dance_styles where id = p_style;
  -- Estilo sin roles: una sola tarjeta con rol `leader` (D051). Con roles y perfil sin rol:
  -- se agregan las tarjetas de los dos roles (null = todos).
  v_card_role := case when v_style.has_roles then v_profile_role else 'leader' end;
  select u.course_id into v_course
  from public.lessons l join public.course_units u on u.id = l.unit_id
  where l.id = p_lesson;

  return jsonb_build_object(
    'activeSubscription', exists (
      select 1 from public.subscriptions
      where user_id = p_user and status = 'active' and current_period_end > now()
    ),
    'isAdmin', exists (
      select 1 from public.profiles where id = p_user and app_role = 'admin'
    ),
    'style', case when v_style.id is null then null else jsonb_build_object(
      'id', v_style.id,
      'published', v_style.published,
      'hasRoles', v_style.has_roles,
      'startPosition', v_style.start_position_id,
      'beatsPerPhrase', v_style.beats_per_phrase,
      'spokenBeats', to_jsonb(v_style.spoken_beats),
      'callBeat', v_style.call_beat,
      'callSpanBeats', v_style.call_span_beats,
      'leadInPhrases', v_style.lead_in_phrases
    ) end,
    'song', (
      select jsonb_build_object(
        'id', s.id,
        'visible', s.published
          and (s.license_expires_at is null or s.license_expires_at >= current_date),
        'inStyle', exists (
          select 1 from public.song_styles ss where ss.song_id = s.id and ss.style_id = p_style
        ),
        'beatGrid', s.beat_grid,
        'danceEndMs', s.dance_end_ms
      )
      from public.songs s where s.id = p_song
    ),
    'lesson', (
      select jsonb_build_object(
        'id', l.id,
        'styleId', c.style_id,
        'visible', c.published and ds.published,
        'unlocked', (
          with ordered as (
            select l2.id, lag(l2.id) over (order by u2.position, l2.position) as prev
            from public.lessons l2
            join public.course_units u2 on u2.id = l2.unit_id
            where u2.course_id = v_course
          )
          select o.prev is null or exists (
            select 1 from public.lesson_progress lp
            where lp.user_id = p_user and lp.lesson_id in (o.prev, o.id)
          )
          from ordered o where o.id = l.id
        ),
        'practiceSongId', l.practice_song_id,
        'practicePhrases', l.practice_phrases,
        'stepIds', coalesce((
          select jsonb_agg(ls.step_id order by ls.position)
          from public.lesson_steps ls where ls.lesson_id = l.id
        ), '[]'::jsonb),
        -- Pasos de las lecciones anteriores del curso (ya enseñados): conectan posiciones.
        'previousStepIds', coalesce((
          select jsonb_agg(distinct ls.step_id)
          from public.lesson_steps ls
          join public.lessons l2 on l2.id = ls.lesson_id
          join public.course_units u2 on u2.id = l2.unit_id
          join public.course_units u on u.id = l.unit_id
          where u2.course_id = v_course
            and (u2.position, l2.position) < (u.position, l.position)
            and ls.step_id not in (select step_id from public.lesson_steps where lesson_id = l.id)
        ), '[]'::jsonb)
      )
      from public.lessons l
      join public.courses c on c.id = v_course
      join public.dance_styles ds on ds.id = c.style_id
      where l.id = p_lesson
    ),
    'steps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'slug', s.slug,
        'published', s.published,
        'category', s.category,
        'difficulty', s.difficulty,
        'startPosition', s.start_position_id,
        'endPosition', s.end_position_id,
        'phrases', s.phrases,
        'canStart', s.can_start,
        'canEnd', s.can_end,
        'repeatable', s.repeatable,
        'status', coalesce(us.status, 'unknown'),
        'favorite', coalesce(us.favorite, false),
        'card', card.value,
        'popularity', pop.percentile
      ) order by s.sort_order, s.slug)
      from public.steps s
      left join public.user_steps us on us.user_id = p_user and us.step_id = s.id
      left join lateral (
        -- Una tarjeta por rol: con varios (perfil sin rol) vale la más urgente y la más difícil.
        select jsonb_build_object(
          'dueAt', min(c.due_at),
          'difficulty', max(c.difficulty) filter (where c.last_review_at is not null)
        ) as value
        from public.srs_cards c
        where c.user_id = p_user and c.step_id = s.id
          and (v_card_role is null or c.role = v_card_role)
        having count(*) > 0
      ) card on true
      left join public.step_popularity(p_style) pop on pop.step_id = s.id
      where s.style_id = p_style
    ), '[]'::jsonb)
  );
end
$$;

-- ── plan-session: escritura ──────────────────────────────────────────────────
-- Registra la sesión ya calculada en una transacción: practice_sessions (con la semilla
-- efectiva, los filtros y el plan) y un practice_session_steps por paso distinto (suma de
-- sus frases; alimenta step_popularity y la calificación al terminar). Vuelve a comprobar la
-- suscripción. Devuelve `{ sessionId }`.
--
-- p_payload:
-- { styleId, songId, mode, lessonId, seed, filters, phrasesAvailable,
--   plan: [{ stepId, startPhrase, phrases }], steps: [{ stepId, phrases }] }

create function public.ef_plan_session(p_user uuid, p_payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_session uuid;
begin
  if not exists (
    select 1 from public.subscriptions
    where user_id = p_user and status = 'active' and current_period_end > now()
  ) then
    raise exception 'no_active_subscription';
  end if;

  insert into public.practice_sessions (
    user_id, style_id, song_id, mode, lesson_id, seed, filters, phrases_available, plan
  ) values (
    p_user,
    (p_payload ->> 'styleId')::uuid,
    (p_payload ->> 'songId')::uuid,
    (p_payload ->> 'mode')::public.session_mode,
    (p_payload ->> 'lessonId')::uuid,
    (p_payload ->> 'seed')::bigint,
    coalesce(p_payload -> 'filters', '{}'::jsonb),
    (p_payload ->> 'phrasesAvailable')::smallint,
    p_payload -> 'plan'
  )
  returning id into v_session;

  insert into public.practice_session_steps (session_id, step_id, phrases)
  select v_session, s."stepId", s.phrases
  from jsonb_to_recordset(coalesce(p_payload -> 'steps', '[]'::jsonb)) as s(
    "stepId" uuid, phrases smallint
  );

  return jsonb_build_object('sessionId', v_session);
end
$$;

-- ── Permisos: solo service_role (las Edge Functions) ─────────────────────────

revoke execute on function
  public.ef_plan_session_state(uuid, uuid, uuid, uuid),
  public.ef_plan_session(uuid, jsonb)
from public, anon, authenticated;

grant execute on function
  public.ef_plan_session_state(uuid, uuid, uuid, uuid),
  public.ef_plan_session(uuid, jsonb)
to service_role;
