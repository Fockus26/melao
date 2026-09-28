-- 07a·2 (3/3) — Datos del alumno: estado y favoritos, tarjetas FSRS, repasos, sesiones,
-- progreso del curso y popularidad.
-- Contrato: docs/spec/api.md, srs.md, combinaciones.md. Decisiones: D003, D013, D036, D038.
--
-- Quién escribe (D003, D013):
-- * El cliente: solo lo que no es regla de negocio — favoritos y cerrar una sesión.
-- * Edge Functions (service_role): tarjetas FSRS, repasos, estado de los pasos, sesiones y
--   progreso de lecciones. Ellas comprueban la suscripción antes de escribir.
-- * Cada alumno lee solo lo suyo; el admin lee todo (panel, soporte).

-- ── Tipos ────────────────────────────────────────────────────────────────────

create type public.step_status as enum ('unknown', 'learning', 'known');
create type public.card_state as enum ('new', 'learning', 'review', 'relearning');
create type public.review_context as enum ('lesson', 'practice', 'catalog');
create type public.session_mode as enum ('lesson', 'free');

-- ── user_steps: estado del catálogo y favorito (producto.md §4) ──────────────
-- Uno por (alumno, paso). El estado lo cambia review-steps ("me lo sé" registra un repaso,
-- srs.md); el favorito, el cliente.

create table public.user_steps (
  user_id uuid not null references public.profiles (id) on delete cascade,
  step_id uuid not null references public.steps (id) on delete cascade,
  status public.step_status not null default 'unknown',
  favorite boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, step_id)
);

create index user_steps_step on public.user_steps (step_id);
create index user_steps_favorites on public.user_steps (user_id) where favorite;

create trigger user_steps_updated_at before update on public.user_steps
  for each row execute function private.set_updated_at();

-- ── srs_cards: una tarjeta FSRS por (alumno, paso, rol) (srs.md, D013) ───────

create table public.srs_cards (
  user_id uuid not null references public.profiles (id) on delete cascade,
  step_id uuid not null references public.steps (id) on delete cascade,
  role public.dance_role not null,
  state public.card_state not null default 'new',
  stability double precision not null default 0 check (stability >= 0),
  difficulty double precision not null default 0 check (difficulty between 0 and 10),
  due_at timestamptz not null default now(),
  last_review_at timestamptz,
  reps integer not null default 0 check (reps >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, step_id, role)
);

create index srs_cards_due on public.srs_cards (user_id, due_at);
create index srs_cards_step on public.srs_cards (step_id);

-- ── practice_sessions y sus pasos ────────────────────────────────────────────
-- Las crea plan-session con el plan y la línea de tiempo calculados en el backend.

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  style_id uuid not null references public.dance_styles (id),
  song_id uuid not null references public.songs (id),
  mode public.session_mode not null,
  lesson_id uuid references public.lessons (id) on delete set null,
  seed bigint not null,
  filters jsonb not null default '{}'::jsonb,
  phrases_available smallint not null check (phrases_available >= 0),
  plan jsonb not null check (jsonb_typeof(plan) = 'array'),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (mode = 'free' or lesson_id is not null),
  check (completed_at is null or completed_at >= created_at)
);

create index practice_sessions_user on public.practice_sessions (user_id, created_at desc);
create index practice_sessions_song_recent on public.practice_sessions (song_id, created_at);
create index practice_sessions_style on public.practice_sessions (style_id);
create index practice_sessions_lesson on public.practice_sessions (lesson_id);

-- Un paso distinto por sesión: alimenta la popularidad y la calificación al terminar.
create table public.practice_session_steps (
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  step_id uuid not null references public.steps (id) on delete cascade,
  phrases smallint not null check (phrases >= 1),
  primary key (session_id, step_id)
);

create index practice_session_steps_step on public.practice_session_steps (step_id);

-- ── step_reviews: historial de calificaciones (srs.md) ───────────────────────
-- Idempotente por (sesión, paso, rol): reenviar la misma calificación no duplica.

create table public.step_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  step_id uuid not null references public.steps (id) on delete cascade,
  role public.dance_role not null,
  rating smallint not null check (rating between 1 and 4),
  context public.review_context not null,
  session_id uuid references public.practice_sessions (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  reviewed_at timestamptz not null default now(),
  due_after timestamptz,
  unique (session_id, step_id, role)
);

create index step_reviews_user_step on public.step_reviews (user_id, step_id, reviewed_at desc);
create index step_reviews_step on public.step_reviews (step_id);
create index step_reviews_lesson on public.step_reviews (lesson_id);

-- ── lesson_progress (producto.md §2) ─────────────────────────────────────────
-- La escribe review-steps al calificar la práctica final (desbloqueo lineal).

create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index lesson_progress_lesson on public.lesson_progress (lesson_id);

-- ── user_song_favorites ──────────────────────────────────────────────────────

create table public.user_song_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create index user_song_favorites_song on public.user_song_favorites (song_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'user_steps', 'srs_cards', 'practice_sessions', 'step_reviews',
    'lesson_progress', 'user_song_favorites'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()) or (select private.is_admin()))',
      t || ': el dueño o un admin leen', t
    );
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end;
$$;

alter table public.practice_session_steps enable row level security;
create policy "practice_session_steps: el dueño de la sesión o un admin leen"
  on public.practice_session_steps for select to authenticated
  using (exists (select 1 from public.practice_sessions s where s.id = session_id));
revoke all on public.practice_session_steps from anon, authenticated;
grant select on public.practice_session_steps to authenticated;
grant select, insert, update, delete on public.practice_session_steps to service_role;

-- Favorito de un paso: el cliente crea su fila o cambia solo `favorite`, en pasos que ve.
create policy "user_steps: el dueño marca favoritos"
  on public.user_steps for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.steps s where s.id = step_id)
  );
create policy "user_steps: el dueño cambia su favorito"
  on public.user_steps for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant insert (user_id, step_id, favorite) on public.user_steps to authenticated;
grant update (favorite) on public.user_steps to authenticated;

-- Favoritos de canciones: el cliente los pone y los quita, en canciones que ve.
create policy "user_song_favorites: el dueño agrega"
  on public.user_song_favorites for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.songs s where s.id = song_id)
  );
create policy "user_song_favorites: el dueño quita"
  on public.user_song_favorites for delete to authenticated
  using (user_id = (select auth.uid()));
grant insert (user_id, song_id), delete on public.user_song_favorites to authenticated;

-- Cerrar una sesión propia (marca de fin); el plan no se toca.
create policy "practice_sessions: el dueño la cierra"
  on public.practice_sessions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant update (completed_at) on public.practice_sessions to authenticated;

-- ── Popularidad (producto.md, reglas transversales) ──────────────────────────
-- Agregados globales sin datos personales: security definer para contar todas las sesiones;
-- solo devuelven contenido visible para quien llama.

create function public.song_popularity()
returns table (song_id uuid, sessions_30d bigint, percentile double precision)
language sql stable
security definer
set search_path = ''
as $$
  with counts as (
    select s.id as song_id, count(ps.id) as sessions_30d
    from public.songs s
    left join public.practice_sessions ps
      on ps.song_id = s.id and ps.created_at > now() - interval '30 days'
    where private.song_visible(s.id) or private.is_admin()
    group by s.id
  )
  select song_id, sessions_30d, percent_rank() over (order by sessions_30d)
  from counts
$$;

create function public.step_popularity(style uuid)
returns table (step_id uuid, appearances_30d bigint, percentile double precision)
language sql stable
security definer
set search_path = ''
as $$
  with counts as (
    select st.id as step_id, count(recent.session_id) as appearances_30d
    from public.steps st
    left join (
      select pss.step_id, pss.session_id
      from public.practice_session_steps pss
      join public.practice_sessions ps on ps.id = pss.session_id
      where ps.created_at > now() - interval '30 days'
    ) recent on recent.step_id = st.id
    where st.style_id = style
      and ((st.published and private.style_visible(st.style_id)) or private.is_admin())
    group by st.id
  )
  select step_id, appearances_30d, percent_rank() over (order by appearances_30d)
  from counts
$$;

revoke execute on function public.song_popularity(), public.step_popularity(uuid) from public, anon;
grant execute on function public.song_popularity(), public.step_popularity(uuid)
  to authenticated, service_role;
