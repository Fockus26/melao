-- Admin · Estilos (tanda admin, ola B): bandas de BPM válidas, guardar un estilo (datos y
-- configuración del motor) en una sola escritura, qué bloquea publicarlo, borrar solo estilos
-- vacíos y sin publicar, y no borrar una posición en uso. Aditiva.
-- Contrato: docs/spec/api.md § Admin · Estilos. Decisiones: D003 (la regla vive aquí), D022
-- (un estilo es configuración), D163–D167.
--
-- Quién: todo lo de aquí es del admin (`private.is_admin()`); las escrituras siguen pasando por
-- la RLS de `20260927120000_contenido.sql`. Las funciones son `security invoker` (la RLS del
-- admin basta). Las reglas de borrar y publicar valen para la API (`private.is_api_write()`,
-- de `20261003120000_admin_steps.sql`); el seed y las migraciones (postgres) quedan fuera.
-- Errores propios (SQLSTATE de clase `ME`, el cliente los traduce; los de pasos son `MS`):
--   ME001  tiempos hablados inválidos (vacíos, repetidos o fuera de 1…tiempos por frase)
--   ME002  el anuncio no cabe en la frase (tiempo del anuncio + tiempos que ocupa − 1 > frase)
--   ME003  bandas de BPM inválidas (hasta 4 topes enteros en 40–300, estrictamente ascendentes)
--   ME004  borrar un estilo publicado (primero se despublica)
--   ME005  borrar un estilo con contenido (pasos, canciones o curso)
--   ME006  borrar una posición que usan pasos
--   ME007  borrar la posición inicial del estilo
--   ME008  publicar un estilo sin posición inicial

-- ── Bandas de BPM (D163) ─────────────────────────────────────────────────────
-- Tope de BPM por nivel, ascendente (`private.song_difficulty`): con 4 topes, niveles 1–4 y el
-- 5 por encima del último. El panel escribe 4 topes o ninguno; la base acepta de 0 a 4 (las
-- bandas parciales siguen dando niveles, y `{}` = sin bandas, como hasta ahora).

create function private.bpm_bands_valid(p_bands smallint[]) returns boolean
language sql immutable
set search_path = ''
as $$
  select p_bands is null or (
    cardinality(p_bands) <= 4
    and array_position(p_bands, null) is null
    and 40 <= all (p_bands)
    and 300 >= all (p_bands)
    and not exists (
      select 1
      from unnest(p_bands) with ordinality as a (cap, i)
      join unnest(p_bands) with ordinality as b (cap, i) on b.i = a.i + 1
      where b.cap <= a.cap
    )
  )
$$;

alter table public.dance_styles
  add constraint dance_styles_bpm_bands_valid
  check (private.bpm_bands_valid(difficulty_bpm_bands));

-- ── Publicar (D165) ──────────────────────────────────────────────────────────
-- Lo único que bloquea publicar es la posición inicial (el generador arranca ahí; el `check`
-- `dance_styles_published_needs_start` ya lo exige). El trigger da un código propio antes del
-- `check`. La validación del catálogo (`validateCatalog`) la muestra el panel como aviso.

create function private.dance_styles_check_publish() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_api_write() and new.published and new.start_position_id is null then
    raise exception 'el estilo "%" necesita posición inicial para publicarse', new.name
      using errcode = 'ME008';
  end if;
  return new;
end;
$$;

create trigger dance_styles_check_publish
  before insert or update of published, start_position_id on public.dance_styles
  for each row execute function private.dance_styles_check_publish();

-- ── Borrar un estilo (D164) ──────────────────────────────────────────────────
-- Solo uno sin publicar y vacío: sin pasos, sin canciones (`song_styles`) y sin curso. Sus
-- posiciones se van en cascada. Como no puede tener pasos, la cascada nunca llega a
-- `steps_check_delete` ni a `step_videos_keep_complete`.

create function private.dance_styles_check_delete() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_api_write() then
    return old;
  end if;
  if old.published then
    raise exception 'el estilo "%" está publicado; despublícalo antes de borrarlo', old.name
      using errcode = 'ME004';
  end if;
  if exists (select 1 from public.steps s where s.style_id = old.id)
    or exists (select 1 from public.song_styles ss where ss.style_id = old.id)
    or exists (select 1 from public.courses c where c.style_id = old.id)
  then
    raise exception 'el estilo "%" tiene pasos, canciones o curso; solo se borra vacío', old.name
      using errcode = 'ME005';
  end if;
  return old;
end;
$$;

create trigger dance_styles_check_delete
  before delete on public.dance_styles
  for each row execute function private.dance_styles_check_delete();

-- ── Borrar una posición (D166) ───────────────────────────────────────────────
-- Ni una que usa algún paso (de entrada o de salida) ni la inicial del estilo. En la cascada
-- del borrado de su estilo, el estilo ya no está: no hay nada que cuidar.

create function private.positions_check_delete() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_api_write()
    or not exists (select 1 from public.dance_styles d where d.id = old.style_id)
  then
    return old;
  end if;
  if exists (
    select 1 from public.steps s
    where s.style_id = old.style_id
      and (s.start_position_id = old.id or s.end_position_id = old.id)
  ) then
    raise exception 'la posición "%" la usan pasos; cámbiales la posición antes de borrarla', old.name
      using errcode = 'ME006';
  end if;
  if exists (
    select 1 from public.dance_styles d
    where d.id = old.style_id and d.start_position_id = old.id
  ) then
    raise exception 'la posición "%" es la inicial del estilo; elige otra antes de borrarla', old.name
      using errcode = 'ME007';
  end if;
  return old;
end;
$$;

create trigger positions_check_delete
  before delete on public.positions
  for each row execute function private.positions_check_delete();

-- ── admin_styles: la pantalla entera ─────────────────────────────────────────
-- Todos los estilos (publicados o no) por `sort_order` y nombre, con su configuración, los
-- contadores que deciden si se puede borrar y sus posiciones con cuántos pasos las usan
-- (`positions`: `[{ id, slug, name, step_count }]` por nombre). Para quien no es admin, ninguna
-- fila.

create function public.admin_styles()
returns table (
  id uuid,
  slug text,
  name text,
  published boolean,
  sort_order smallint,
  has_roles boolean,
  beats_per_phrase smallint,
  spoken_beats smallint[],
  call_beat smallint,
  call_span_beats smallint,
  lead_in_phrases smallint,
  difficulty_bpm_bands smallint[],
  start_position_id uuid,
  step_count integer,
  steps_published integer,
  song_count integer,
  has_course boolean,
  positions jsonb
)
language sql stable
security invoker
set search_path = ''
as $$
  select
    d.id,
    d.slug,
    d.name,
    d.published,
    d.sort_order,
    d.has_roles,
    d.beats_per_phrase,
    d.spoken_beats,
    d.call_beat,
    d.call_span_beats,
    d.lead_in_phrases,
    d.difficulty_bpm_bands,
    d.start_position_id,
    (select count(*)::integer from public.steps s where s.style_id = d.id),
    (select count(*)::integer from public.steps s where s.style_id = d.id and s.published),
    (select count(*)::integer from public.song_styles ss where ss.style_id = d.id),
    exists (select 1 from public.courses c where c.style_id = d.id),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'slug', p.slug,
          'name', p.name,
          'step_count', (
            select count(*) from public.steps s
            where s.style_id = d.id
              and (s.start_position_id = p.id or s.end_position_id = p.id)
          )
        )
        order by p.name, p.id
      )
      from public.positions p
      where p.style_id = d.id
    ), '[]'::jsonb)
  from public.dance_styles d
  where (select private.is_admin())
  order by d.sort_order, d.name, d.id
$$;

revoke execute on function public.admin_styles() from public, anon;
grant execute on function public.admin_styles() to authenticated, service_role;

-- ── admin_style_issues: por qué no se puede publicar ─────────────────────────
-- Vacío = se puede publicar. Hoy un solo motivo: `missing_start_position` (el mismo código que
-- los Pendientes del Resumen). Estilo inexistente o sin ser admin: null.

create function public.admin_style_issues(p_style_id uuid)
returns text[]
language sql stable
security invoker
set search_path = ''
as $$
  select case
    when d.start_position_id is null then array['missing_start_position']
    else array[]::text[]
  end
  from public.dance_styles d
  where d.id = p_style_id
    and (select private.is_admin())
$$;

revoke execute on function public.admin_style_issues(uuid) from public, anon;
grant execute on function public.admin_style_issues(uuid) to authenticated, service_role;

-- ── admin_save_style: datos y configuración de una vez (D167) ────────────────
-- `p_style_id` null crea (sin publicar); si no, edita ese estilo. `p_style` lleva los campos
-- editables (slug, name, sort_order, has_roles, beats_per_phrase, spoken_beats, call_beat,
-- call_span_beats, lead_in_phrases, difficulty_bpm_bands, start_position_id); `published` no
-- pasa por aquí. `p_start_position` (`{ name, slug }`, opcional) crea una posición nueva y la
-- deja como inicial: así un estilo nuevo nace con su posición inicial en la misma transacción
-- (la FK de la posición inicial es diferida; aquí se comprueba al final, no en el `commit`).
-- Todo o nada. Devuelve el id.
-- Errores: 42501 sin ser admin; P0002 estilo inexistente; 23505 slug repetido; 23503 posición
-- inicial de otro estilo; ME001/ME002/ME003; ME008 (publicado sin posición inicial); 23514 otro
-- campo fuera de rango (nombre, slug, tiempos por frase, frases de entrada).

create function public.admin_save_style(
  p_style_id uuid,
  p_style jsonb,
  p_start_position jsonb default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_bpp smallint := (p_style ->> 'beats_per_phrase')::smallint;
  v_spoken smallint[] := array(
    select jsonb_array_elements_text(coalesce(p_style -> 'spoken_beats', '[]'::jsonb))::smallint
  );
  v_call smallint := (p_style ->> 'call_beat')::smallint;
  v_span smallint := (p_style ->> 'call_span_beats')::smallint;
  v_bands smallint[] := case
    when jsonb_typeof(p_style -> 'difficulty_bpm_bands') = 'array' then array(
      select jsonb_array_elements_text(p_style -> 'difficulty_bpm_bands')::smallint
    )
  end;
  v_start uuid := (p_style ->> 'start_position_id')::uuid;
begin
  if not (select private.is_admin()) then
    raise exception 'solo un admin edita estilos' using errcode = '42501';
  end if;

  -- Las reglas del motor (motor-de-ritmo §1) con código propio; los `check` de la tabla siguen
  -- siendo la última palabra.
  if v_bpp is not null and v_bpp between 2 and 16 then
    if cardinality(v_spoken) not between 1 and v_bpp
      or not (1 <= all (v_spoken) and v_bpp >= all (v_spoken))
      or (select count(distinct b) from unnest(v_spoken) as b) <> cardinality(v_spoken)
    then
      raise exception 'tiempos hablados inválidos' using errcode = 'ME001';
    end if;
    if v_call is null or v_span is null
      or v_call not between 1 and v_bpp
      or v_span not between 1 and 4
      or v_call + v_span - 1 > v_bpp
    then
      raise exception 'el anuncio no cabe en la frase' using errcode = 'ME002';
    end if;
  end if;
  if cardinality(v_bands) = 0 then
    v_bands := null;
  end if;
  if not private.bpm_bands_valid(v_bands) then
    raise exception 'bandas de BPM inválidas' using errcode = 'ME003';
  end if;

  if p_style_id is null then
    insert into public.dance_styles (
      slug, name, sort_order, has_roles, beats_per_phrase, spoken_beats, call_beat,
      call_span_beats, lead_in_phrases, difficulty_bpm_bands, start_position_id
    ) values (
      p_style ->> 'slug',
      btrim(p_style ->> 'name'),
      coalesce((p_style ->> 'sort_order')::smallint, 0),
      coalesce((p_style ->> 'has_roles')::boolean, true),
      v_bpp,
      v_spoken,
      v_call,
      v_span,
      (p_style ->> 'lead_in_phrases')::smallint,
      v_bands,
      v_start
    )
    returning id into v_id;
  else
    update public.dance_styles set
      slug = p_style ->> 'slug',
      name = btrim(p_style ->> 'name'),
      sort_order = coalesce((p_style ->> 'sort_order')::smallint, 0),
      has_roles = coalesce((p_style ->> 'has_roles')::boolean, true),
      beats_per_phrase = v_bpp,
      spoken_beats = v_spoken,
      call_beat = v_call,
      call_span_beats = v_span,
      lead_in_phrases = (p_style ->> 'lead_in_phrases')::smallint,
      difficulty_bpm_bands = v_bands,
      start_position_id = v_start
    where id = p_style_id
    returning id into v_id;
    if v_id is null then
      raise exception 'estilo no encontrado' using errcode = 'P0002';
    end if;
  end if;

  if p_start_position is not null then
    insert into public.positions (style_id, slug, name)
    values (v_id, p_start_position ->> 'slug', btrim(p_start_position ->> 'name'))
    returning id into v_start;
    update public.dance_styles set start_position_id = v_start where id = v_id;
  end if;

  -- La FK diferida de la posición inicial, comprobada ya (el error sale de esta llamada).
  set constraints public.dance_styles_start_position_fk immediate;
  set constraints public.dance_styles_start_position_fk deferred;

  return v_id;
end;
$$;

revoke execute on function public.admin_save_style(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.admin_save_style(uuid, jsonb, jsonb) to authenticated, service_role;
