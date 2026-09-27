-- 07a·2 (2/3) — Contenido: estilos, posiciones, pasos, videos, canciones y curso; Storage.
-- Contrato: docs/spec/api.md. Decisiones: D009, D010, D012, D016, D022, D023, D036.
--
-- Acceso (D036):
-- * Filas de contenido publicado: cualquier alumno con cuenta (la vitrina, con candado).
-- * Medios (Storage `step-videos`, `songs`, `voice-clips`): solo con suscripción activa o admin.
-- * Todo lo no publicado y toda escritura: solo admin.
-- * Anónimo: nada de contenido.

-- ── Ajustes de 1/3 (asesor de Supabase) ─────────────────────────────────────

drop policy "profiles: el dueño edita sus preferencias" on public.profiles;
drop policy "profiles: un admin edita cualquiera" on public.profiles;
create policy "profiles: el dueño o un admin editan"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

create index subscriptions_plan_id on public.subscriptions (plan_id);

-- ── Tipos ────────────────────────────────────────────────────────────────────

create type public.step_category as enum (
  'base', 'vuelta', 'entrada', 'salida', 'figura', 'variacion', 'libre'
);
create type public.video_role as enum ('leader', 'follower', 'both');

-- ── dance_styles ─────────────────────────────────────────────────────────────
-- Un estilo es configuración (D022): cuenta, anuncio, bandas de BPM, roles.
-- Campos del motor: docs/spec/motor-de-ritmo.md §1.

create table public.dance_styles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 60),
  beats_per_phrase smallint not null default 8 check (beats_per_phrase between 2 and 16),
  spoken_beats smallint[] not null,
  call_beat smallint not null default 5,
  call_span_beats smallint not null default 2 check (call_span_beats between 1 and 4),
  lead_in_phrases smallint not null default 1 check (lead_in_phrases between 0 and 4),
  has_roles boolean not null default true,
  -- Tope de BPM de cada nivel de dificultad, ascendente (nivel n = BPM ≤ tope n). PENDIENTE.
  difficulty_bpm_bands smallint[],
  start_position_id uuid,
  published boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(spoken_beats) between 1 and beats_per_phrase),
  check (1 <= all (spoken_beats) and beats_per_phrase >= all (spoken_beats)),
  check (call_beat between 1 and beats_per_phrase),
  check (call_beat + call_span_beats - 1 <= beats_per_phrase)
);

create trigger dance_styles_updated_at before update on public.dance_styles
  for each row execute function private.set_updated_at();

-- ── positions ────────────────────────────────────────────────────────────────

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  style_id uuid not null references public.dance_styles (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 60),
  unique (style_id, slug),
  unique (style_id, id)
);

-- La posición inicial tiene que ser del mismo estilo.
alter table public.dance_styles
  add constraint dance_styles_start_position_fk
  foreign key (id, start_position_id) references public.positions (style_id, id)
  deferrable initially deferred;

-- Un estilo publicado necesita posición inicial (el generador arranca ahí).
alter table public.dance_styles
  add constraint dance_styles_published_needs_start
  check (not published or start_position_id is not null);

-- ── steps ────────────────────────────────────────────────────────────────────
-- Nodos del grafo de combinaciones (D012, combinaciones.md). `slug` nombra el clip de voz
-- `step.<slug>` (motor-de-ritmo §7). Las variaciones son pasos con `variation_of`.

create table public.steps (
  id uuid primary key default gen_random_uuid(),
  style_id uuid not null references public.dance_styles (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 2000),
  -- Descripción por tiempos: [{ "beat": 1, "note": "…" }] (beat 1…beats_per_phrase).
  beat_notes jsonb not null default '[]'::jsonb check (jsonb_typeof(beat_notes) = 'array'),
  category public.step_category not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  start_position_id uuid not null,
  end_position_id uuid not null,
  phrases smallint not null default 1 check (phrases between 1 and 16),
  can_start boolean not null default false,
  can_end boolean not null default false,
  repeatable boolean not null default false,
  variation_of uuid,
  voice_clip_path text,
  published boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (style_id, slug),
  unique (style_id, id),
  foreign key (style_id, start_position_id) references public.positions (style_id, id),
  foreign key (style_id, end_position_id) references public.positions (style_id, id),
  foreign key (style_id, variation_of) references public.steps (style_id, id) on delete set null (variation_of),
  check (variation_of is distinct from id)
);

create index steps_style_published on public.steps (style_id) where published;
create index steps_start_position on public.steps (style_id, start_position_id);
create index steps_end_position on public.steps (style_id, end_position_id);
create index steps_variation_of on public.steps (style_id, variation_of);

create trigger steps_updated_at before update on public.steps
  for each row execute function private.set_updated_at();

create table public.step_prerequisites (
  step_id uuid not null references public.steps (id) on delete cascade,
  requires_step_id uuid not null references public.steps (id) on delete cascade,
  primary key (step_id, requires_step_id),
  check (step_id <> requires_step_id)
);

create index step_prerequisites_requires on public.step_prerequisites (requires_step_id);

-- Video por rol (D016, D023); un paso libre tiene uno solo con role 'both'.
create table public.step_videos (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.steps (id) on delete cascade,
  role public.video_role not null,
  video_path text not null,
  poster_path text,
  duration_ms integer check (duration_ms > 0),
  aspect text not null default '16:9' check (aspect in ('16:9', '4:5', '9:16')),
  created_at timestamptz not null default now(),
  unique (step_id, role)
);

-- ── songs ────────────────────────────────────────────────────────────────────
-- Rejilla por anclas (D010, motor-de-ritmo §2): beat_grid = [{ "beat": int, "tMs": int }, …].
-- Sin fuente y documento de licencia no se publica (D009); vencida, deja de verse.

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  artist text not null check (char_length(artist) between 1 and 120),
  audio_path text,
  duration_ms integer check (duration_ms > 0),
  bpm numeric(5, 1) check (bpm between 40 and 300),
  beat_grid jsonb check (jsonb_typeof(beat_grid) = 'array'),
  dance_end_ms integer check (dance_end_ms > 0),
  difficulty_override smallint check (difficulty_override between 1 and 5),
  license_source text check (char_length(license_source) <= 200),
  license_notes text check (char_length(license_notes) <= 2000),
  license_document_path text,
  license_expires_at date,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (dance_end_ms is null or duration_ms is null or dance_end_ms <= duration_ms),
  constraint songs_publish_requirements check (
    not published or (
      audio_path is not null
      and duration_ms is not null
      and dance_end_ms is not null
      and jsonb_array_length(beat_grid) >= 2
      and license_source is not null
      and license_document_path is not null
    )
  )
);

create trigger songs_updated_at before update on public.songs
  for each row execute function private.set_updated_at();

create table public.song_styles (
  song_id uuid not null references public.songs (id) on delete cascade,
  style_id uuid not null references public.dance_styles (id) on delete cascade,
  primary key (song_id, style_id)
);

create index song_styles_style on public.song_styles (style_id);

-- ── Curso ────────────────────────────────────────────────────────────────────
-- Un curso por estilo; unidades y lecciones con orden (producto.md §2).

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  style_id uuid not null unique references public.dance_styles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger courses_updated_at before update on public.courses
  for each row execute function private.set_updated_at();

create table public.course_units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position smallint not null check (position >= 1),
  title text not null check (char_length(title) between 1 and 120),
  unique (course_id, position) deferrable initially deferred
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.course_units (id) on delete cascade,
  position smallint not null check (position >= 1),
  title text not null check (char_length(title) between 1 and 120),
  intro text check (char_length(intro) <= 2000),
  practice_song_id uuid references public.songs (id) on delete set null,
  practice_phrases smallint check (practice_phrases between 1 and 32),
  final_song_id uuid references public.songs (id) on delete set null,
  unique (unit_id, position) deferrable initially deferred
);

create index lessons_practice_song on public.lessons (practice_song_id);
create index lessons_final_song on public.lessons (final_song_id);

create table public.lesson_steps (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  step_id uuid not null references public.steps (id) on delete cascade,
  position smallint not null check (position >= 1),
  primary key (lesson_id, step_id),
  unique (lesson_id, position) deferrable initially deferred
);

create index lesson_steps_step on public.lesson_steps (step_id);

-- ── profiles.default_style_id (D023) ─────────────────────────────────────────

alter table public.profiles
  add column default_style_id uuid references public.dance_styles (id) on delete set null;
create index profiles_default_style on public.profiles (default_style_id);
grant update (default_style_id) on public.profiles to authenticated;

-- ── Visibilidad ──────────────────────────────────────────────────────────────
-- ¿Se ve este estilo / curso / canción? Publicado (y, en canciones, licencia vigente).
-- security definer: evalúan la fila padre sin pasar por su propia RLS.

create function private.style_visible(style uuid) returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.dance_styles where id = style and published)
$$;

create function private.course_visible(course uuid) returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.courses c
    join public.dance_styles s on s.id = c.style_id
    where c.id = course and c.published and s.published
  )
$$;

create function private.song_visible(song uuid) returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.songs
    where id = song and published
      and (license_expires_at is null or license_expires_at >= current_date)
  )
$$;

revoke execute on function private.style_visible(uuid), private.course_visible(uuid), private.song_visible(uuid)
  from public;
grant execute on function private.style_visible(uuid), private.course_visible(uuid), private.song_visible(uuid)
  to authenticated;

-- ── RLS: una política de lectura (visible o admin) y tres de escritura (admin) ──

do $$
declare
  t text;
  visible text;
begin
  foreach t in array array[
    'dance_styles', 'positions', 'steps', 'step_prerequisites', 'step_videos',
    'songs', 'song_styles', 'courses', 'course_units', 'lessons', 'lesson_steps'
  ] loop
    visible := case t
      when 'dance_styles' then 'published'
      when 'positions' then '(select private.style_visible(style_id))'
      when 'steps' then 'published and (select private.style_visible(style_id))'
      when 'step_prerequisites' then 'exists (select 1 from public.steps s where s.id = step_id)'
      when 'step_videos' then 'exists (select 1 from public.steps s where s.id = step_id)'
      when 'songs' then 'published and (license_expires_at is null or license_expires_at >= current_date)'
      when 'song_styles' then '(select private.song_visible(song_id)) and (select private.style_visible(style_id))'
      when 'courses' then '(select private.course_visible(id))'
      when 'course_units' then '(select private.course_visible(course_id))'
      when 'lessons' then 'exists (select 1 from public.course_units u where u.id = unit_id)'
      when 'lesson_steps' then 'exists (select 1 from public.lessons l where l.id = lesson_id)'
    end;

    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (%s or (select private.is_admin()))',
      t || ': visible o admin', t, visible
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.is_admin()))',
      t || ': admin crea', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
      t || ': admin edita', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.is_admin()))',
      t || ': admin borra', t
    );
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end;
$$;

-- ── Storage ──────────────────────────────────────────────────────────────────
-- Buckets privados; el cliente pide URLs firmadas de corta duración. Los medios de alumno
-- exigen suscripción activa (D036); las licencias, solo admin.

insert into storage.buckets (id, name, public) values
  ('step-videos', 'step-videos', false),
  ('songs', 'songs', false),
  ('voice-clips', 'voice-clips', false),
  ('song-licenses', 'song-licenses', false)
on conflict (id) do nothing;

create policy "contenido: medios con suscripción activa; todo para admin"
  on storage.objects for select to authenticated
  using (
    (select private.is_admin())
    or (
      bucket_id in ('step-videos', 'songs', 'voice-clips')
      and (select public.has_active_subscription())
    )
  );

create policy "contenido: admin sube"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('step-videos', 'songs', 'voice-clips', 'song-licenses')
    and (select private.is_admin())
  );

create policy "contenido: admin reemplaza"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('step-videos', 'songs', 'voice-clips', 'song-licenses')
    and (select private.is_admin())
  )
  with check (
    bucket_id in ('step-videos', 'songs', 'voice-clips', 'song-licenses')
    and (select private.is_admin())
  );

create policy "contenido: admin borra"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('step-videos', 'songs', 'voice-clips', 'song-licenses')
    and (select private.is_admin())
  );
