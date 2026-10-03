-- Admin · Camino (tanda admin, ola B): el constructor del curso de un estilo. Una lectura con todo
-- lo que usa la pantalla, reordenar unidades y lecciones en una transacción, guardar una lección
-- con sus pasos en orden y las reglas de escritura del curso. Aditiva.
-- Contrato: docs/spec/api.md § Admin · Camino. Decisiones: D003 (la regla vive aquí, no en el
-- cliente), D168–D173.
--
-- Quién: todo lo de aquí es del admin (`private.is_admin()`); las escrituras siguen pasando por
-- la RLS de `20260927120000_contenido.sql`. Las funciones son `security invoker`: la RLS del
-- admin basta (también para contar `lesson_progress`, que el admin lee).
--
-- Las reglas valen para las escrituras de la API (`private.is_api_write()`); el seed y las
-- migraciones (postgres) quedan fuera, como en Pasos.
-- Errores propios (SQLSTATE de clase `MS`; del MS021 en adelante para no chocar con las otras
-- pantallas del admin, que numeran desde el MS006):
--   MS021  paso de otro estilo en una lección
--   MS022  canción de la lección sin ese estilo en `song_styles`
--   MS023  borrar una lección (o una unidad con lecciones) que algún alumno ya completó
--   MS024  mover una lección a una unidad de otro curso
--   MS025  publicar un curso incompleto (`private.course_issues`)

-- ── Reglas de las lecciones ─────────────────────────────────────────────────

-- Estilo del curso de una unidad.
create function private.unit_style(p_unit_id uuid) returns uuid
language sql stable
set search_path = ''
as $$
  select c.style_id
  from public.course_units u
  join public.courses c on c.id = u.course_id
  where u.id = p_unit_id
$$;

revoke execute on function private.unit_style(uuid) from public, anon;
grant execute on function private.unit_style(uuid) to authenticated, service_role;

-- Los pasos de una lección son del estilo del curso (D169).
create function private.lesson_steps_check() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_api_write() then
    return new;
  end if;
  if (select s.style_id from public.steps s where s.id = new.step_id)
     is distinct from (
       select private.unit_style(l.unit_id) from public.lessons l where l.id = new.lesson_id
     )
  then
    raise exception 'un paso de la lección tiene que ser del estilo del curso'
      using errcode = 'MS021';
  end if;
  return new;
end;
$$;

create trigger lesson_steps_check
  before insert or update of step_id, lesson_id on public.lesson_steps
  for each row execute function private.lesson_steps_check();

-- Una lección no cambia de curso, y sus canciones (mini práctica y final) tienen el estilo del
-- curso en `song_styles` (D169). Solo se revisa la canción que cambia: una que perdió el
-- estilo después no bloquea otros cambios de la lección.
create function private.lessons_check() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_style uuid;
begin
  if not private.is_api_write() then
    return new;
  end if;
  v_style := private.unit_style(new.unit_id);
  if tg_op = 'UPDATE' and new.unit_id is distinct from old.unit_id and (
    select u1.course_id from public.course_units u1 where u1.id = new.unit_id
  ) is distinct from (
    select u0.course_id from public.course_units u0 where u0.id = old.unit_id
  ) then
    raise exception 'una lección no se mueve a otro curso' using errcode = 'MS024';
  end if;
  if (new.practice_song_id is not null
      and (tg_op = 'INSERT' or new.practice_song_id is distinct from old.practice_song_id)
      and not exists (
        select 1 from public.song_styles ss
        where ss.song_id = new.practice_song_id and ss.style_id = v_style
      ))
    or (new.final_song_id is not null
      and (tg_op = 'INSERT' or new.final_song_id is distinct from old.final_song_id)
      and not exists (
        select 1 from public.song_styles ss
        where ss.song_id = new.final_song_id and ss.style_id = v_style
      ))
  then
    raise exception 'la canción de la lección tiene que tener el estilo del curso'
      using errcode = 'MS022';
  end if;
  return new;
end;
$$;

create trigger lessons_check
  before insert or update of unit_id, practice_song_id, final_song_id on public.lessons
  for each row execute function private.lessons_check();

-- ── Borrar con progreso (D171) ───────────────────────────────────────────────
-- Una lección que algún alumno completó no se borra (perdería su avance y el desbloqueo de la
-- siguiente); tampoco la unidad que la contiene. El borrado en cascada de un curso o un estilo
-- (profundidad > 1) no pasa por aquí.

create function private.lessons_check_delete() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_api_write() or pg_trigger_depth() > 1 then
    return old;
  end if;
  if exists (select 1 from public.lesson_progress lp where lp.lesson_id = old.id) then
    raise exception 'la lección "%" ya la completaron alumnos; no se puede borrar', old.title
      using errcode = 'MS023';
  end if;
  return old;
end;
$$;

create trigger lessons_check_delete
  before delete on public.lessons
  for each row execute function private.lessons_check_delete();

create function private.course_units_check_delete() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_api_write() or pg_trigger_depth() > 1 then
    return old;
  end if;
  if exists (
    select 1 from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
    where l.unit_id = old.id
  ) then
    raise exception 'la unidad "%" tiene lecciones que ya completaron alumnos; no se puede borrar', old.title
      using errcode = 'MS023';
  end if;
  return old;
end;
$$;

create trigger course_units_check_delete
  before delete on public.course_units
  for each row execute function private.course_units_check_delete();

-- ── Publicar un curso (D170) ─────────────────────────────────────────────────
-- Motivos en orden fijo; vacío = se puede publicar. Lo que el alumno no podría hacer: un curso
-- sin lecciones, una lección sin pasos o sin ninguna canción (sin final no se completa). Los
-- pasos o canciones sin publicar no bloquean: el Resumen los avisa (D155).

create function private.course_issues(p_course_id uuid) returns text[]
language sql stable
set search_path = ''
as $$
  select array_remove(array[
    case when not exists (
      select 1 from public.lessons l
      join public.course_units u on u.id = l.unit_id
      where u.course_id = p_course_id
    ) then 'no_lessons' end,
    case when exists (
      select 1 from public.lessons l
      join public.course_units u on u.id = l.unit_id
      where u.course_id = p_course_id
        and not exists (select 1 from public.lesson_steps ls where ls.lesson_id = l.id)
    ) then 'lesson_without_steps' end,
    case when exists (
      select 1 from public.lessons l
      join public.course_units u on u.id = l.unit_id
      where u.course_id = p_course_id
        and l.practice_song_id is null and l.final_song_id is null
    ) then 'lesson_without_song' end
  ], null)
$$;

revoke execute on function private.course_issues(uuid) from public, anon;
grant execute on function private.course_issues(uuid) to authenticated, service_role;

-- Publicar (insert publicado o false → true) exige un curso completo. No revalida un curso ya
-- publicado en otros cambios.
create function private.courses_check_publish() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_api_write()
    and new.published
    and (tg_op = 'INSERT' or not old.published)
    and cardinality(private.course_issues(new.id)) > 0
  then
    raise exception 'el curso "%" está incompleto para publicarse', new.title
      using errcode = 'MS025',
            hint = 'Cada lección necesita al menos un paso y una canción.';
  end if;
  return new;
end;
$$;

create trigger courses_check_publish
  before insert or update of published on public.courses
  for each row execute function private.courses_check_publish();

-- ── admin_course: una lectura con todo el constructor (D168) ────────────────
-- jsonb `{ style, positions, steps, songs, course, units }` (null si el estilo no existe).
-- `steps`: todos los del estilo (publicados o no) en el orden del catálogo, con lo que usa la
-- validación del core (`validateLesson`). `songs`: las del estilo en `song_styles` y las que
-- usan sus lecciones aunque ya no lo tengan (`in_style` false); `visible` = la ve el alumno
-- (publicada y con licencia vigente). `units` en orden, con sus lecciones en orden; cada lección
-- trae sus pasos en orden (`step_ids`), cuántos alumnos la completaron (`progress_count`) y los
-- avisos de canción del Resumen (`missing_song`, `song_unavailable`). Sin ser admin: 42501.

create function public.admin_course(p_style_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_course public.courses%rowtype;
begin
  if not (select private.is_admin()) then
    raise exception 'solo un admin lee el camino' using errcode = '42501';
  end if;
  if not exists (select 1 from public.dance_styles ds where ds.id = p_style_id) then
    return null;
  end if;
  select * into v_course from public.courses c where c.style_id = p_style_id;

  return jsonb_build_object(
    'style', (
      select jsonb_build_object(
        'id', ds.id, 'slug', ds.slug, 'name', ds.name, 'published', ds.published,
        'start_position_id', ds.start_position_id,
        'beats_per_phrase', ds.beats_per_phrase, 'spoken_beats', to_jsonb(ds.spoken_beats),
        'call_beat', ds.call_beat, 'call_span_beats', ds.call_span_beats,
        'lead_in_phrases', ds.lead_in_phrases
      )
      from public.dance_styles ds where ds.id = p_style_id
    ),
    'positions', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by p.name, p.id)
      from public.positions p where p.style_id = p_style_id
    ), '[]'::jsonb),
    'steps', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', s.id, 'slug', s.slug, 'name', s.name, 'category', s.category,
          'published', s.published, 'phrases', s.phrases,
          'start_position_id', s.start_position_id, 'end_position_id', s.end_position_id,
          'can_start', s.can_start, 'can_end', s.can_end, 'repeatable', s.repeatable
        ) order by s.sort_order, s.name, s.id)
      from public.steps s where s.style_id = p_style_id
    ), '[]'::jsonb),
    'songs', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', so.id, 'title', so.title, 'artist', so.artist, 'published', so.published,
          'visible', so.published
            and (so.license_expires_at is null or so.license_expires_at >= current_date),
          'in_style', exists (
            select 1 from public.song_styles ss
            where ss.song_id = so.id and ss.style_id = p_style_id
          ),
          'duration_ms', so.duration_ms, 'dance_end_ms', so.dance_end_ms,
          'beat_grid', so.beat_grid, 'bpm', so.bpm
        ) order by so.title, so.id)
      from public.songs so
      where exists (
          select 1 from public.song_styles ss
          where ss.song_id = so.id and ss.style_id = p_style_id
        )
        or so.id in (
          select x.song_id
          from public.lessons l
          join public.course_units u on u.id = l.unit_id
          cross join lateral (values (l.practice_song_id), (l.final_song_id)) as x (song_id)
          where u.course_id = v_course.id
        )
    ), '[]'::jsonb),
    'course', case when v_course.id is null then null else jsonb_build_object(
        'id', v_course.id, 'title', v_course.title, 'description', v_course.description,
        'published', v_course.published,
        'issues', to_jsonb(private.course_issues(v_course.id))
      ) end,
    'units', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', u.id, 'position', u.position, 'title', u.title,
          'lessons', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', l.id, 'position', l.position, 'title', l.title, 'intro', l.intro,
                'practice_song_id', l.practice_song_id,
                'practice_phrases', l.practice_phrases,
                'final_song_id', l.final_song_id,
                'progress_count', (
                  select count(*) from public.lesson_progress lp where lp.lesson_id = l.id
                ),
                'step_ids', coalesce((
                  select jsonb_agg(ls.step_id order by ls.position)
                  from public.lesson_steps ls where ls.lesson_id = l.id
                ), '[]'::jsonb),
                'issues', to_jsonb(array_remove(array[
                  case when l.practice_song_id is null and l.final_song_id is null
                    then 'missing_song' end,
                  case when exists (
                    select 1 from public.songs so
                    where so.id in (l.practice_song_id, l.final_song_id)
                      and not (so.published and (
                        so.license_expires_at is null or so.license_expires_at >= current_date
                      ))
                  ) then 'song_unavailable' end
                ], null))
              ) order by l.position, l.id)
            from public.lessons l where l.unit_id = u.id
          ), '[]'::jsonb)
        ) order by u.position, u.id)
      from public.course_units u where u.course_id = v_course.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.admin_course(uuid) from public, anon;
grant execute on function public.admin_course(uuid) to authenticated, service_role;

-- ── Crear unidades y lecciones al final ─────────────────────────────────────
-- La posición nueva es la última + 1. Se bloquea el curso para que dos altas a la vez no
-- choquen en el `unique (…, position)`. Errores: 42501 sin ser admin; P0002 curso o unidad
-- inexistente; 23514 título vacío o de más de 120.

create function public.admin_add_unit(p_course_id uuid, p_title text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not (select private.is_admin()) then
    raise exception 'solo un admin edita el camino' using errcode = '42501';
  end if;
  perform 1 from public.courses c where c.id = p_course_id for update;
  if not found then
    raise exception 'curso no encontrado' using errcode = 'P0002';
  end if;
  insert into public.course_units (course_id, position, title)
  select p_course_id, coalesce(max(u.position), 0) + 1, btrim(p_title)
  from public.course_units u where u.course_id = p_course_id
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.admin_add_unit(uuid, text) from public, anon;
grant execute on function public.admin_add_unit(uuid, text) to authenticated, service_role;

create function public.admin_add_lesson(p_unit_id uuid, p_title text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_course uuid;
  v_id uuid;
begin
  if not (select private.is_admin()) then
    raise exception 'solo un admin edita el camino' using errcode = '42501';
  end if;
  select u.course_id into v_course from public.course_units u where u.id = p_unit_id;
  if v_course is null then
    raise exception 'unidad no encontrada' using errcode = 'P0002';
  end if;
  perform 1 from public.courses c where c.id = v_course for update;
  insert into public.lessons (unit_id, position, title)
  select p_unit_id, coalesce(max(l.position), 0) + 1, btrim(p_title)
  from public.lessons l where l.unit_id = p_unit_id
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.admin_add_lesson(uuid, text) from public, anon;
grant execute on function public.admin_add_lesson(uuid, text) to authenticated, service_role;

-- ── Reordenar (D172) ─────────────────────────────────────────────────────────
-- Una llamada = una transacción: se renumera 1…n toda la lista afectada y el `unique (…,
-- position) deferrable initially deferred` se comprueba al final, así que los cruces
-- intermedios no fallan. `p_position` (1-based) se acota a la lista; las posiciones quedan sin
-- huecos. Reordenar un curso publicado cambia qué lección desbloquea cada alumno
-- (`private.lesson_unlocked` sigue el orden): la UI lo avisa, no se bloquea.
-- Errores: 42501 sin ser admin; P0002 unidad o lección inexistente; 22023 unidad de destino
-- de otro curso.

create function public.admin_move_unit(p_unit_id uuid, p_position integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_course uuid;
  v_ids uuid[];
  v_pos integer;
begin
  if not (select private.is_admin()) then
    raise exception 'solo un admin edita el camino' using errcode = '42501';
  end if;
  select u.course_id into v_course from public.course_units u where u.id = p_unit_id;
  if v_course is null then
    raise exception 'unidad no encontrada' using errcode = 'P0002';
  end if;
  perform 1 from public.courses c where c.id = v_course for update;

  select coalesce(array_agg(u.id order by u.position, u.id), '{}'::uuid[]) into v_ids
  from public.course_units u where u.course_id = v_course and u.id <> p_unit_id;
  v_pos := greatest(1, least(coalesce(p_position, 1), cardinality(v_ids) + 1));
  v_ids := v_ids[1:v_pos - 1] || p_unit_id || v_ids[v_pos:];

  update public.course_units u set position = o.n
  from unnest(v_ids) with ordinality as o (id, n)
  where u.id = o.id and u.position is distinct from o.n;
end;
$$;

revoke execute on function public.admin_move_unit(uuid, integer) from public, anon;
grant execute on function public.admin_move_unit(uuid, integer) to authenticated, service_role;

create function public.admin_move_lesson(p_lesson_id uuid, p_unit_id uuid, p_position integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_from uuid;
  v_course uuid;
  v_ids uuid[];
  v_pos integer;
begin
  if not (select private.is_admin()) then
    raise exception 'solo un admin edita el camino' using errcode = '42501';
  end if;
  select l.unit_id, u.course_id into v_from, v_course
  from public.lessons l
  join public.course_units u on u.id = l.unit_id
  where l.id = p_lesson_id;
  if v_from is null then
    raise exception 'lección no encontrada' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.course_units u where u.id = p_unit_id) then
    raise exception 'unidad no encontrada' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.course_units u where u.id = p_unit_id and u.course_id = v_course
  ) then
    raise exception 'la unidad de destino es de otro curso' using errcode = '22023';
  end if;
  perform 1 from public.courses c where c.id = v_course for update;

  -- Destino: sus lecciones sin la que se mueve, con ella en `p_position`.
  select coalesce(array_agg(l.id order by l.position, l.id), '{}'::uuid[]) into v_ids
  from public.lessons l where l.unit_id = p_unit_id and l.id <> p_lesson_id;
  v_pos := greatest(1, least(coalesce(p_position, 1), cardinality(v_ids) + 1));
  v_ids := v_ids[1:v_pos - 1] || p_lesson_id || v_ids[v_pos:];

  update public.lessons l set unit_id = p_unit_id, position = o.n
  from unnest(v_ids) with ordinality as o (id, n)
  where l.id = o.id and (l.unit_id, l.position) is distinct from (p_unit_id, o.n::smallint);

  -- Origen (si es otra unidad): se cierra el hueco.
  if v_from <> p_unit_id then
    update public.lessons l set position = o.n
    from (
      select x.id, row_number() over (order by x.position, x.id) as n
      from public.lessons x where x.unit_id = v_from
    ) as o
    where l.id = o.id and l.position is distinct from o.n;
  end if;
end;
$$;

revoke execute on function public.admin_move_lesson(uuid, uuid, integer) from public, anon;
grant execute on function public.admin_move_lesson(uuid, uuid, integer) to authenticated, service_role;

-- ── admin_save_lesson: la lección y sus pasos en orden (D168) ───────────────
-- `p_lesson`: `title`, `intro`, `practice_song_id`, `practice_phrases` (1–32), `final_song_id`
-- (null = sin canción). `p_steps` reemplaza la lista entera, en ese orden (posición 1…n). Todo
-- en una transacción. Errores: 42501 sin ser admin; P0002 lección inexistente; 22023 un paso
-- repetido; 23514 un campo fuera de rango; MS021 paso de otro estilo; MS022 canción sin el
-- estilo del curso.

create function public.admin_save_lesson(p_lesson_id uuid, p_lesson jsonb, p_steps uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_steps uuid[] := coalesce(p_steps, '{}'::uuid[]);
  v_id uuid;
begin
  if not (select private.is_admin()) then
    raise exception 'solo un admin edita el camino' using errcode = '42501';
  end if;
  if cardinality(v_steps) <> (select count(distinct s) from unnest(v_steps) as s) then
    raise exception 'un paso aparece dos veces en la lección' using errcode = '22023';
  end if;

  update public.lessons set
    title = btrim(p_lesson ->> 'title'),
    intro = nullif(btrim(p_lesson ->> 'intro'), ''),
    practice_song_id = (p_lesson ->> 'practice_song_id')::uuid,
    practice_phrases = (p_lesson ->> 'practice_phrases')::smallint,
    final_song_id = (p_lesson ->> 'final_song_id')::uuid
  where id = p_lesson_id
  returning id into v_id;
  if v_id is null then
    raise exception 'lección no encontrada' using errcode = 'P0002';
  end if;

  delete from public.lesson_steps ls
  where ls.lesson_id = p_lesson_id and not (ls.step_id = any (v_steps));
  insert into public.lesson_steps (lesson_id, step_id, position)
  select p_lesson_id, t.step_id, t.n
  from unnest(v_steps) with ordinality as t (step_id, n)
  on conflict (lesson_id, step_id) do update set position = excluded.position
  where public.lesson_steps.position is distinct from excluded.position;
end;
$$;

revoke execute on function public.admin_save_lesson(uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.admin_save_lesson(uuid, jsonb, uuid[]) to authenticated, service_role;
