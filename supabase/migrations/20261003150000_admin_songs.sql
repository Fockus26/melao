-- Admin · Canciones (tanda admin, ola B): qué bloquea publicar una canción (con códigos), guardar
-- una canción con sus estilos en una sola escritura, cuidar lo que una publicada necesita, borrar
-- solo borradores sin lecciones y la lista del editor. Además, el Resumen usa la regla de video
-- completo de `private.step_videos_complete` en vez de repetirla. Aditiva.
-- Contrato: docs/spec/api.md § Admin · Canciones. Decisiones: D003 (la regla vive aquí, no en el
-- cliente), D009 (licencia), D010 (rejilla por anclas), D158–D162.
--
-- Quién: todo lo de aquí es del admin (`private.is_admin()`); las escrituras siguen pasando por
-- la RLS de `20260927120000_contenido.sql`. Funciones `security invoker`: la RLS del admin basta.
-- El check `songs_publish_requirements` se queda (última defensa); los triggers de aquí llegan
-- antes con un código propio y un mensaje claro.
--
-- Las reglas de escritura valen para la API (`anon`, `authenticated`, `service_role`,
-- `private.is_api_write()`); el seed y las migraciones (postgres) quedan fuera. Las canciones ya
-- publicadas no se revalidan en otros cambios: solo se cuida lo que el cambio quita.
-- Errores propios (SQLSTATE de clase `MS`, el cliente los traduce):
--   MS201  publicar una canción a la que le falta algo (detail = los códigos, separados por coma)
--   MS202  quitarle a una canción publicada algo que necesita (audio, licencia, rejilla, estilo)
--   MS203  borrar una canción publicada (primero se despublica)
--   MS204  borrar una canción que usa alguna lección (práctica o final)

-- ── Qué le falta a una canción para publicarse (D158) ───────────────────────
-- Motivos en orden fijo; vacío = se puede publicar. Recibe la fila (en un trigger, `new`) para
-- ver los cambios de la misma escritura; los estilos se leen de `song_styles`.
--   missing_audio             sin audio o sin duración
--   missing_grid              rejilla con menos de 2 anclas (la marca el analizador, ola C)
--   missing_dance_end         sin fin de baile (analizador)
--   missing_style             sin ningún estilo (D160)
--   missing_license_source    sin fuente de la licencia (D009)
--   missing_license_document  sin documento de la licencia (D009)
--   license_expired           la licencia venció (`license_expires_at` < hoy)
-- El Resumen (`admin_summary`) junta fuente y documento en `missing_license`.

create function private.song_issues(p_song public.songs) returns text[]
language sql stable
security invoker
set search_path = ''
as $$
  select array_remove(array[
    case when p_song.audio_path is null or p_song.duration_ms is null
      then 'missing_audio' end,
    case when coalesce(jsonb_array_length(p_song.beat_grid), 0) < 2
      then 'missing_grid' end,
    case when p_song.dance_end_ms is null then 'missing_dance_end' end,
    case when not exists (
      select 1 from public.song_styles ss where ss.song_id = p_song.id
    ) then 'missing_style' end,
    case when p_song.license_source is null then 'missing_license_source' end,
    case when p_song.license_document_path is null then 'missing_license_document' end,
    case when p_song.license_expires_at < current_date then 'license_expired' end
  ], null)
$$;

revoke execute on function private.song_issues(public.songs) from public, anon;
grant execute on function private.song_issues(public.songs) to authenticated, service_role;

-- ── Publicar y lo que una publicada necesita (D158) ─────────────────────────
-- Publicar (insert publicado o false → true) exige `song_issues` vacío → MS201. Una canción ya
-- publicada no pierde audio, duración, licencia, rejilla ni fin de baile → MS202 (solo si el
-- cambio los quita: no se revalida lo que ya estaba así).

create function private.songs_check_publish() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_issues text[];
begin
  if not private.is_api_write() then
    return new;
  end if;
  if new.published and (tg_op = 'INSERT' or not old.published) then
    v_issues := private.song_issues(new);
    if cardinality(v_issues) > 0 then
      raise exception 'la canción "%" no se puede publicar todavía (%)',
          new.title, array_to_string(v_issues, ', ')
        using errcode = 'MS201',
              detail = array_to_string(v_issues, ','),
              hint = 'Pide admin_song_issues(id) para ver qué le falta.';
    end if;
  elsif tg_op = 'UPDATE' and old.published and new.published and (
    (old.audio_path is not null and new.audio_path is null)
    or (old.duration_ms is not null and new.duration_ms is null)
    or (old.license_source is not null and new.license_source is null)
    or (old.license_document_path is not null and new.license_document_path is null)
    or (old.dance_end_ms is not null and new.dance_end_ms is null)
    or (
      coalesce(jsonb_array_length(old.beat_grid), 0) >= 2
      and coalesce(jsonb_array_length(new.beat_grid), 0) < 2
    )
  ) then
    raise exception 'la canción "%" está publicada y necesita audio, licencia y ritmo; despublícala antes de quitarlos', new.title
      using errcode = 'MS202';
  end if;
  return new;
end;
$$;

create trigger songs_check_publish
  before insert or update on public.songs
  for each row execute function private.songs_check_publish();

-- Una canción publicada no se queda sin estilos (D160). La cascada desde un estilo borrado
-- (profundidad > 1) no pasa por aquí: un estilo con canciones no se borra desde el panel.
create function private.song_styles_keep_one() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_api_write()
    and pg_trigger_depth() = 1
    and exists (select 1 from public.songs s where s.id = old.song_id and s.published)
    and not exists (select 1 from public.song_styles ss where ss.song_id = old.song_id)
  then
    raise exception 'una canción publicada necesita al menos un estilo; despublícala antes de quitarle el último'
      using errcode = 'MS202';
  end if;
  return null;
end;
$$;

create trigger song_styles_keep_one
  after delete or update of song_id on public.song_styles
  for each row execute function private.song_styles_keep_one();

-- ── Borrar una canción (D161) ────────────────────────────────────────────────
-- Solo borradores que ninguna lección usa: una publicada se despublica; una que es práctica o
-- final de alguna lección se cambia antes en la lección (si no, la FK la dejaría en null en
-- silencio).

create function private.songs_check_delete() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_api_write() or pg_trigger_depth() > 1 then
    return old;
  end if;
  if old.published then
    raise exception 'la canción "%" está publicada; despublícala antes de borrarla', old.title
      using errcode = 'MS203';
  end if;
  if exists (
    select 1 from public.lessons l
    where l.practice_song_id = old.id or l.final_song_id = old.id
  ) then
    raise exception 'la canción "%" la usa una lección; cámbiala en la lección antes de borrarla', old.title
      using errcode = 'MS204';
  end if;
  return old;
end;
$$;

create trigger songs_check_delete
  before delete on public.songs
  for each row execute function private.songs_check_delete();

-- ── admin_songs: la lista del editor (D159) ──────────────────────────────────
-- Todas las canciones (publicadas y borradores) por título y artista. Búsqueda y filtros, en el
-- cliente (decenas de canciones). Para quien no es admin, ninguna fila.
--   style_slugs      estilos de la canción por `sort_order` del estilo
--   ready            preparada para practicar: audio + duración + rejilla (≥ 2 anclas) + fin de
--                    baile (lo que `plan-session` y el reproductor necesitan)
--   license_status   `expired` (venció) · `expiring` (vence en ≤ 30 días, como el Resumen) ·
--                    `ok` (vigente o sin fecha)
--   lesson_count     lecciones que la usan como práctica o final
--   auto_difficulty  por las bandas de BPM del primer estilo (`private.song_difficulty`, sin
--                    `difficulty_override`); null sin BPM o sin bandas
--   difficulty       la efectiva: `difficulty_override` si la hay; si no, `auto_difficulty`

create function public.admin_songs()
returns table (
  id uuid,
  title text,
  artist text,
  published boolean,
  style_slugs text[],
  ready boolean,
  has_audio boolean,
  bpm numeric,
  duration_ms integer,
  license_source text,
  has_license_document boolean,
  license_expires_at date,
  license_status text,
  lesson_count integer,
  difficulty_override smallint,
  auto_difficulty smallint,
  difficulty smallint
)
language sql stable
security invoker
set search_path = ''
as $$
  select
    s.id,
    s.title,
    s.artist,
    s.published,
    coalesce((
      select array_agg(ds.slug order by ds.sort_order, ds.name)
      from public.song_styles ss
      join public.dance_styles ds on ds.id = ss.style_id
      where ss.song_id = s.id
    ), '{}'::text[]),
    s.audio_path is not null
      and s.duration_ms is not null
      and coalesce(jsonb_array_length(s.beat_grid), 0) >= 2
      and s.dance_end_ms is not null,
    s.audio_path is not null,
    s.bpm,
    s.duration_ms,
    s.license_source,
    s.license_document_path is not null,
    s.license_expires_at,
    case
      when s.license_expires_at < current_date then 'expired'
      when s.license_expires_at <= current_date + 30 then 'expiring'
      else 'ok'
    end,
    (
      select count(*)::integer from public.lessons l
      where l.practice_song_id = s.id or l.final_song_id = s.id
    ),
    s.difficulty_override,
    auto.difficulty,
    coalesce(s.difficulty_override, auto.difficulty)
  from public.songs s
  left join lateral (
    select private.song_difficulty(null, s.bpm, ds.difficulty_bpm_bands) as difficulty
    from public.song_styles ss
    join public.dance_styles ds on ds.id = ss.style_id
    where ss.song_id = s.id
    order by ds.sort_order, ds.name
    limit 1
  ) auto on true
  where (select private.is_admin())
  order by s.title, s.artist, s.id
$$;

revoke execute on function public.admin_songs() from public, anon;
grant execute on function public.admin_songs() to authenticated, service_role;

-- ── admin_song_issues: por qué no se puede publicar (D158) ──────────────────
-- Los códigos de `private.song_issues`; vacío = se puede publicar. La UI los muestra en texto
-- antes del botón sin repetir la regla. Canción inexistente o sin ser admin: null.

create function public.admin_song_issues(p_song_id uuid)
returns text[]
language sql stable
security invoker
set search_path = ''
as $$
  select private.song_issues(s)
  from public.songs s
  where s.id = p_song_id
    and (select private.is_admin())
$$;

revoke execute on function public.admin_song_issues(uuid) from public, anon;
grant execute on function public.admin_song_issues(uuid) to authenticated, service_role;

-- ── admin_save_song: la canción y sus estilos de una vez (D162) ─────────────
-- `p_song_id` null crea (sin publicar); si no, edita esa canción. `p_song` lleva los campos
-- editables (title, artist, difficulty_override, license_source, license_notes,
-- license_expires_at); `published`, los archivos (audio, documento) y el ritmo (bpm, beat_grid,
-- dance_end_ms: los escribe el analizador) no pasan por aquí. `p_style_ids` reemplaza la lista
-- entera (primero se agregan los nuevos y después se quitan los que sobran, para que una
-- publicada nunca pase por "sin estilos"). Todo en una transacción. Devuelve el id.
-- Errores: 42501 sin ser admin; P0002 canción inexistente; 23503 estilo inexistente; 23514 un
-- campo fuera de rango; 22007/22008 fecha inválida; MS202 dejar sin estilos o sin licencia una
-- publicada.

create function public.admin_save_song(
  p_song_id uuid,
  p_song jsonb,
  p_style_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_styles uuid[] := coalesce(p_style_ids, '{}'::uuid[]);
begin
  if not (select private.is_admin()) then
    raise exception 'solo un admin edita canciones' using errcode = '42501';
  end if;

  if p_song_id is null then
    insert into public.songs (
      title, artist, difficulty_override, license_source, license_notes, license_expires_at
    ) values (
      btrim(p_song ->> 'title'),
      btrim(p_song ->> 'artist'),
      (p_song ->> 'difficulty_override')::smallint,
      nullif(btrim(p_song ->> 'license_source'), ''),
      nullif(btrim(p_song ->> 'license_notes'), ''),
      (nullif(p_song ->> 'license_expires_at', ''))::date
    )
    returning id into v_id;
  else
    update public.songs set
      title = btrim(p_song ->> 'title'),
      artist = btrim(p_song ->> 'artist'),
      difficulty_override = (p_song ->> 'difficulty_override')::smallint,
      license_source = nullif(btrim(p_song ->> 'license_source'), ''),
      license_notes = nullif(btrim(p_song ->> 'license_notes'), ''),
      license_expires_at = (nullif(p_song ->> 'license_expires_at', ''))::date
    where id = p_song_id
    returning id into v_id;
    if v_id is null then
      raise exception 'canción no encontrada' using errcode = 'P0002';
    end if;
  end if;

  insert into public.song_styles (song_id, style_id)
  select distinct v_id, st from unnest(v_styles) as st
  on conflict do nothing;
  delete from public.song_styles ss
  where ss.song_id = v_id and not (ss.style_id = any (v_styles));

  return v_id;
end;
$$;

revoke execute on function public.admin_save_song(uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.admin_save_song(uuid, jsonb, uuid[]) to authenticated, service_role;

-- ── Resumen: una sola regla de video completo ────────────────────────────────
-- `admin_summary()` idéntica a la de `20261003130000_admin_summary.sql` salvo que el video
-- completo de un paso sale de `private.step_videos_complete` (pendiente de la ola A): misma
-- condición, un solo sitio.

create or replace function public.admin_summary()
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
    -- Video completo (D149): la regla de private.step_videos_complete.
    step_info as (
      select st.id, st.name, st.style_id, st.published, sr.slug as style, sr.rank,
        private.step_videos_complete(st.id) as videos_complete
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
