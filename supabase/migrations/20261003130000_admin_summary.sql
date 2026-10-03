-- Resumen del admin (`/admin`): contadores, avisos y pendientes en una sola lectura. Aditiva:
-- solo una función.
-- Contrato: docs/spec/api.md § Funciones del admin. Decisiones: D003 (contadores y avisos
-- viven aquí, no en Next), D009 (licencia vigente), D154 (forma de la respuesta), D155 (qué
-- es un aviso y qué un pendiente).
--
-- `security invoker`: el admin lee todo el contenido, los perfiles y las suscripciones por RLS
-- (políticas "visible o admin" y "el dueño o un admin leen"). Un no-admin no tendría los datos
-- completos, así que se le corta con `42501` antes de leer nada.

-- ── admin_summary ───────────────────────────────────────────────────────────
-- jsonb con cuatro claves:
--
-- * `styles`: todos los estilos por `sort_order` y nombre, cada uno con sus contadores:
--   `{ id, slug, name, published, steps_published, steps_total, songs_published, songs_total,
--   lessons_published, lessons_total }`. Una canción cuenta en cada estilo de `song_styles`.
--   `lessons_published` = lecciones de su curso si curso y estilo están publicados (lo que ve
--   el alumno, `private.course_visible`).
-- * `totals`: los mismos contadores sin repetir (una canción en dos estilos cuenta una vez;
--   las canciones sin estilo también cuentan) + `students` (`app_role = 'student'`) y
--   `students_active` (con la condición de `has_active_subscription()`: `active` y período
--   sin vencer).
-- * `warnings` (D155, algo mal en lo publicado): `{ kind, id, name, style, reasons, expires_on }`
--   - `step` publicado sin video completo → `missing_video`.
--   - `song` publicada con licencia vencida → `license_expired`, o que vence en ≤ 30 días →
--     `license_expiring`; `expires_on` = `license_expires_at`.
--   - `lesson` de un curso visible que usa pasos sin publicar → `step_unpublished`, una canción
--     (práctica o final) no visible → `song_unavailable`, o ninguna canción → `missing_song`.
-- * `pending` (D155, borradores): `{ kind, id, name, style, reasons }`
--   - `step` sin publicar; `reasons` = `missing_video` si le falta video, `[]` si ya se puede
--     publicar.
--   - `song` sin publicar; `reasons` = lo que le falta según `songs_publish_requirements`:
--     `missing_audio` (audio o duración), `missing_grid` (< 2 anclas), `missing_dance_end`,
--     `missing_license` (fuente o documento).
--   - `style` sin publicar; `missing_start_position` si no tiene posición inicial.
--
-- `style` es el slug del estilo (en una canción, el primero de sus estilos por `sort_order`;
-- null si no tiene). Orden de cada lista: por tipo (step, song, lesson / step, song, style),
-- luego por estilo y nombre (lecciones: en el orden del curso). Los textos los pone la UI
-- a partir de los códigos.

create function public.admin_summary()
returns jsonb
language plpgsql stable
security invoker
set search_path = ''
as $$
begin
  if not coalesce((select private.is_admin()), false) then
    raise exception 'admin_summary: solo para el admin' using errcode = '42501';
  end if;

  return (
    with
    style_rank as (
      select ds.id, ds.slug,
        row_number() over (order by ds.sort_order, ds.name) as rank
      from public.dance_styles ds
    ),
    -- Video completo: uno `both`, o uno `leader` y uno `follower`.
    step_info as (
      select st.id, st.name, st.style_id, st.published, sr.slug as style, sr.rank,
        -- misma regla que private.step_videos_complete (A1)
        (
          exists (select 1 from public.step_videos v where v.step_id = st.id and v.role = 'both')
          or (
            exists (select 1 from public.step_videos v where v.step_id = st.id and v.role = 'leader')
            and exists (select 1 from public.step_videos v where v.step_id = st.id and v.role = 'follower')
          )
        ) as videos_complete
      from public.steps st
      join style_rank sr on sr.id = st.style_id
    ),
    song_info as (
      select so.*,
        (
          select sr.slug from public.song_styles ss
          join style_rank sr on sr.id = ss.style_id
          where ss.song_id = so.id
          order by sr.rank limit 1
        ) as style,
        (
          select min(sr.rank) from public.song_styles ss
          join style_rank sr on sr.id = ss.style_id
          where ss.song_id = so.id
        ) as rank,
        so.published
          and (so.license_expires_at is null or so.license_expires_at >= current_date)
          as visible
      from public.songs so
    ),
    lesson_info as (
      select l.id, l.title as name, l.practice_song_id, l.final_song_id,
        c.style_id, sr.slug as style, sr.rank, cu.position as unit_position,
        l.position as lesson_position,
        c.published and ds.published as visible
      from public.lessons l
      join public.course_units cu on cu.id = l.unit_id
      join public.courses c on c.id = cu.course_id
      join public.dance_styles ds on ds.id = c.style_id
      join style_rank sr on sr.id = c.style_id
    ),
    warnings as (
      select 1 as kind_rank, s.rank, 0 as sub, s.name, jsonb_build_object(
          'kind', 'step', 'id', s.id, 'name', s.name, 'style', s.style,
          'reasons', jsonb_build_array('missing_video'), 'expires_on', null
        ) as item
      from step_info s
      where s.published and not s.videos_complete
      union all
      select 2, so.rank, 0, so.title, jsonb_build_object(
          'kind', 'song', 'id', so.id, 'name', so.title, 'style', so.style,
          'reasons', jsonb_build_array(
            case when so.license_expires_at < current_date
              then 'license_expired' else 'license_expiring' end
          ),
          'expires_on', so.license_expires_at
        )
      from song_info so
      where so.published and so.license_expires_at <= current_date + 30
      union all
      select 3, x.rank, x.unit_position * 1000 + x.lesson_position, x.name, jsonb_build_object(
          'kind', 'lesson', 'id', x.id, 'name', x.name, 'style', x.style,
          'reasons', to_jsonb(x.reasons), 'expires_on', null
        )
      from (
        select li.*, array_remove(array[
          case when exists (
            select 1 from public.lesson_steps ls
            join public.steps st on st.id = ls.step_id
            where ls.lesson_id = li.id and not st.published
          ) then 'step_unpublished' end,
          case when exists (
            select 1 from song_info so
            where so.id in (li.practice_song_id, li.final_song_id) and not so.visible
          ) then 'song_unavailable' end,
          case when li.practice_song_id is null and li.final_song_id is null
            then 'missing_song' end
        ], null) as reasons
        from lesson_info li
        where li.visible
      ) x
      where cardinality(x.reasons) > 0
    ),
    pending as (
      select 1 as kind_rank, s.rank, s.name, jsonb_build_object(
          'kind', 'step', 'id', s.id, 'name', s.name, 'style', s.style,
          'reasons', case when s.videos_complete then '[]'::jsonb
            else jsonb_build_array('missing_video') end
        ) as item
      from step_info s
      where not s.published
      union all
      select 2, so.rank, so.title, jsonb_build_object(
          'kind', 'song', 'id', so.id, 'name', so.title, 'style', so.style,
          'reasons', to_jsonb(array_remove(array[
            case when so.audio_path is null or so.duration_ms is null
              then 'missing_audio' end,
            case when coalesce(jsonb_array_length(so.beat_grid), 0) < 2
              then 'missing_grid' end,
            case when so.dance_end_ms is null then 'missing_dance_end' end,
            case when so.license_source is null or so.license_document_path is null
              then 'missing_license' end
          ], null))
        )
      from song_info so
      where not so.published
      union all
      select 3, sr.rank, ds.name, jsonb_build_object(
          'kind', 'style', 'id', ds.id, 'name', ds.name, 'style', ds.slug,
          'reasons', case when ds.start_position_id is null
            then jsonb_build_array('missing_start_position') else '[]'::jsonb end
        )
      from public.dance_styles ds
      join style_rank sr on sr.id = ds.id
      where not ds.published
    )
    select jsonb_build_object(
      'styles', coalesce((
        select jsonb_agg(jsonb_build_object(
            'id', ds.id, 'slug', ds.slug, 'name', ds.name, 'published', ds.published,
            'steps_published', (select count(*) from step_info s where s.style_id = ds.id and s.published),
            'steps_total', (select count(*) from step_info s where s.style_id = ds.id),
            'songs_published', (
              select count(*) from public.song_styles ss join song_info so on so.id = ss.song_id
              where ss.style_id = ds.id and so.published
            ),
            'songs_total', (select count(*) from public.song_styles ss where ss.style_id = ds.id),
            'lessons_published', (
              select count(*) from lesson_info li where li.style_id = ds.id and li.visible
            ),
            'lessons_total', (select count(*) from lesson_info li where li.style_id = ds.id)
          ) order by sr.rank)
        from public.dance_styles ds
        join style_rank sr on sr.id = ds.id
      ), '[]'::jsonb),
      'totals', jsonb_build_object(
        'steps_published', (select count(*) from step_info s where s.published),
        'steps_total', (select count(*) from step_info),
        'songs_published', (select count(*) from song_info so where so.published),
        'songs_total', (select count(*) from song_info),
        'lessons_published', (select count(*) from lesson_info li where li.visible),
        'lessons_total', (select count(*) from lesson_info),
        'students', (select count(*) from public.profiles p where p.app_role = 'student'),
        'students_active', (
          select count(*) from public.profiles p
          where p.app_role = 'student'
            and exists (
              select 1 from public.subscriptions sub
              where sub.user_id = p.id
                and sub.status = 'active'
                and sub.current_period_end > now()
            )
        )
      ),
      'warnings', coalesce((
        select jsonb_agg(w.item order by w.kind_rank, w.rank nulls last, w.sub, w.name) from warnings w
      ), '[]'::jsonb),
      'pending', coalesce((
        select jsonb_agg(p.item order by p.kind_rank, p.rank nulls last, p.name) from pending p
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke execute on function public.admin_summary() from public, anon;
grant execute on function public.admin_summary() to authenticated;
