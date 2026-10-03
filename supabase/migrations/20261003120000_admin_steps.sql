-- Admin · Pasos (tanda admin, ola A): límites de Storage, regla de publicar un paso, guardar un
-- paso con sus prerequisitos en una sola escritura y las lecturas del editor. Aditiva.
-- Contrato: docs/spec/api.md § Admin · Pasos. Decisiones: D003 (la regla vive aquí, no en el
-- cliente), D016 (paso libre: un video para ambos roles), D149–D153.
--
-- Quién: todo lo de aquí es del admin (`private.is_admin()`); las escrituras siguen pasando por
-- la RLS de `20260927120000_contenido.sql`. Las funciones son `security invoker` (la RLS del
-- admin basta) salvo `private.step_videos_complete`, que la usan los triggers y tiene que ver
-- todos los videos del paso.
--
-- Las reglas de escritura (publicar, borrar, prerequisitos) valen para las escrituras de la API
-- (`anon`, `authenticated`, `service_role`); el seed y las migraciones (postgres) quedan fuera:
-- los pasos de ejemplo del seed están publicados sin video y siguen así (el Resumen los avisa).
-- Errores propios (SQLSTATE de clase `MS`, el cliente los traduce):
--   MS001  publicar sin video completo, o dejar sin video completo un paso publicado
--   MS002  prerequisitos en círculo directo (A requiere B y B requiere A)
--   MS003  prerequisito de otro estilo
--   MS004  borrar un paso publicado (primero se despublica)
--   MS005  borrar un paso que usa alguna lección

-- ── Storage: tamaño y tipos por bucket (D150) ───────────────────────────────
-- 50 MB por archivo y tipos fijos (decisión de César, 2026-10-03). Sin transcodificar en v1.
-- Los clientes mandan siempre el tipo canónico de la extensión (lib/admin/storage.ts).

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = case id
      when 'step-videos' then array['video/mp4', 'video/webm']
      when 'songs' then array['audio/mpeg', 'audio/mp4', 'audio/wav']
      when 'voice-clips' then array['audio/mpeg', 'audio/mp4', 'audio/wav']
      when 'song-licenses' then array['application/pdf', 'image/jpeg', 'image/png']
    end
where id in ('step-videos', 'songs', 'voice-clips', 'song-licenses');

-- ── Regla "paso con video completo" (D149) ───────────────────────────────────
-- Un video para ambos roles, o uno del rol líder y otro del seguidor. El Resumen (A2) usa la
-- misma condición.

create function private.step_videos_complete(p_step_id uuid) returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
      select 1 from public.step_videos v where v.step_id = p_step_id and v.role = 'both'
    )
    or (
      exists (select 1 from public.step_videos v where v.step_id = p_step_id and v.role = 'leader')
      and exists (select 1 from public.step_videos v where v.step_id = p_step_id and v.role = 'follower')
    )
$$;

revoke execute on function private.step_videos_complete(uuid) from public, anon;
grant execute on function private.step_videos_complete(uuid) to authenticated, service_role;

-- ¿La escritura llega por la API? (las reglas de abajo no tocan el seed ni las migraciones)
create function private.is_api_write() returns boolean
language sql stable
set search_path = ''
as $$
  select current_user in ('anon', 'authenticated', 'service_role')
$$;

-- Publicar (insert publicado o false → true) exige video completo. No revalida los pasos ya
-- publicados en otros cambios.
create function private.steps_check_publish() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_api_write()
    and new.published
    and (tg_op = 'INSERT' or not old.published)
    and not private.step_videos_complete(new.id)
  then
    raise exception 'el paso "%" necesita video de cada rol para publicarse', new.name
      using errcode = 'MS001',
            hint = 'Sube el video de líder y el de seguidor, o uno para ambos roles.';
  end if;
  return new;
end;
$$;

create trigger steps_check_publish
  before insert or update of published on public.steps
  for each row execute function private.steps_check_publish();

-- Un paso publicado no se queda sin video completo: ni borrando un video ni cambiándole el rol
-- o el paso. Reemplazar el archivo (update de `video_path`) no cambia nada. Si el paso ya no
-- existe (se borró en cascada), no hay nada que cuidar.
create function private.step_videos_keep_complete() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_api_write()
    and exists (select 1 from public.steps s where s.id = old.step_id and s.published)
    and not private.step_videos_complete(old.step_id)
  then
    raise exception 'un paso publicado necesita video de cada rol; despublícalo antes de quitar este video'
      using errcode = 'MS001';
  end if;
  return null;
end;
$$;

create trigger step_videos_keep_complete
  after delete or update of role, step_id on public.step_videos
  for each row execute function private.step_videos_keep_complete();

-- ── Borrar un paso (D152) ────────────────────────────────────────────────────
-- Solo borradores que ninguna lección usa: un publicado se despublica; uno en una lección se
-- quita antes de la lección (si no, la cascada lo sacaría en silencio). El borrado en cascada
-- de un estilo (profundidad > 1) no pasa por aquí.

create function private.steps_check_delete() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_api_write() or pg_trigger_depth() > 1 then
    return old;
  end if;
  if old.published then
    raise exception 'el paso "%" está publicado; despublícalo antes de borrarlo', old.name
      using errcode = 'MS004';
  end if;
  if exists (select 1 from public.lesson_steps ls where ls.step_id = old.id) then
    raise exception 'el paso "%" está en una lección; quítalo de la lección antes de borrarlo', old.name
      using errcode = 'MS005';
  end if;
  return old;
end;
$$;

create trigger steps_check_delete
  before delete on public.steps
  for each row execute function private.steps_check_delete();

-- ── Prerequisitos (D151) ─────────────────────────────────────────────────────
-- Del mismo estilo y sin círculo directo (A → B → A). Los círculos más largos quedan
-- pendientes (no rompen nada: el generador de combinaciones no usa prerequisitos).

create function private.step_prerequisites_check() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_api_write() then
    return new;
  end if;
  if (select s.style_id from public.steps s where s.id = new.step_id)
     is distinct from (select s.style_id from public.steps s where s.id = new.requires_step_id)
  then
    raise exception 'un prerequisito tiene que ser un paso del mismo estilo'
      using errcode = 'MS003';
  end if;
  if exists (
    select 1 from public.step_prerequisites p
    where p.step_id = new.requires_step_id and p.requires_step_id = new.step_id
  ) then
    raise exception 'prerequisitos en círculo: ese paso ya requiere a este'
      using errcode = 'MS002';
  end if;
  return new;
end;
$$;

create trigger step_prerequisites_check
  before insert or update on public.step_prerequisites
  for each row execute function private.step_prerequisites_check();

-- ── admin_steps: la lista del editor ─────────────────────────────────────────
-- Todos los pasos del estilo (publicados y borradores) en el orden del admin (`sort_order`,
-- nombre). Búsqueda y filtros, en el cliente (≤ 80 pasos por estilo). Para quien no es admin,
-- ninguna fila.

create function public.admin_steps(p_style_id uuid)
returns table (
  id uuid,
  slug text,
  name text,
  category public.step_category,
  difficulty smallint,
  published boolean,
  sort_order smallint,
  videos_complete boolean,
  has_voice_clip boolean,
  lesson_count integer
)
language sql stable
security invoker
set search_path = ''
as $$
  select
    s.id,
    s.slug,
    s.name,
    s.category,
    s.difficulty,
    s.published,
    s.sort_order,
    private.step_videos_complete(s.id),
    s.voice_clip_path is not null,
    (select count(distinct ls.lesson_id)::integer from public.lesson_steps ls where ls.step_id = s.id)
  from public.steps s
  where s.style_id = p_style_id
    and (select private.is_admin())
  order by s.sort_order, s.name, s.id
$$;

revoke execute on function public.admin_steps(uuid) from public, anon;
grant execute on function public.admin_steps(uuid) to authenticated, service_role;

-- ── admin_step_issues: por qué no se puede publicar ──────────────────────────
-- Motivos en orden fijo; vacío = se puede publicar. La UI los muestra en texto antes del botón
-- sin repetir la regla. Paso libre o estilo sin roles (D016): `missing_video_both`; si no,
-- `missing_video_leader` y/o `missing_video_follower`. Paso inexistente o sin ser admin: null.

create function public.admin_step_issues(p_step_id uuid)
returns text[]
language sql stable
security invoker
set search_path = ''
as $$
  select case
    when private.step_videos_complete(s.id) then array[]::text[]
    when s.category = 'libre' or not ds.has_roles then array['missing_video_both']
    else array_remove(array[
      case when not exists (
        select 1 from public.step_videos v where v.step_id = s.id and v.role = 'leader'
      ) then 'missing_video_leader' end,
      case when not exists (
        select 1 from public.step_videos v where v.step_id = s.id and v.role = 'follower'
      ) then 'missing_video_follower' end
    ], null)
  end
  from public.steps s
  join public.dance_styles ds on ds.id = s.style_id
  where s.id = p_step_id
    and (select private.is_admin())
$$;

revoke execute on function public.admin_step_issues(uuid) from public, anon;
grant execute on function public.admin_step_issues(uuid) to authenticated, service_role;

-- ── admin_save_step: el paso y sus prerequisitos de una vez (D153) ───────────
-- `p_step_id` null crea (sin publicar); si no, edita ese paso del estilo. `p_step` lleva los
-- campos editables (slug, name, description, beat_notes, category, difficulty,
-- start_position_id, end_position_id, phrases, can_start, can_end, repeatable, variation_of,
-- sort_order); `published` y los medios no pasan por aquí. `p_prerequisites` reemplaza la
-- lista entera. Todo en una transacción: o se guarda todo o nada. Devuelve el id.
-- Errores: 42501 sin ser admin; P0002 paso inexistente; 23505 slug repetido en el estilo;
-- 23503 posición o variación de otro estilo; 23514 un campo fuera de rango; MS002/MS003.

create function public.admin_save_step(
  p_step_id uuid,
  p_style_id uuid,
  p_step jsonb,
  p_prerequisites uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_prereqs uuid[] := coalesce(p_prerequisites, '{}'::uuid[]);
begin
  if not (select private.is_admin()) then
    raise exception 'solo un admin edita pasos' using errcode = '42501';
  end if;

  if p_step_id is null then
    insert into public.steps (
      style_id, slug, name, description, beat_notes, category, difficulty,
      start_position_id, end_position_id, phrases, can_start, can_end, repeatable,
      variation_of, sort_order
    ) values (
      p_style_id,
      p_step ->> 'slug',
      p_step ->> 'name',
      nullif(btrim(p_step ->> 'description'), ''),
      coalesce(p_step -> 'beat_notes', '[]'::jsonb),
      (p_step ->> 'category')::public.step_category,
      (p_step ->> 'difficulty')::smallint,
      (p_step ->> 'start_position_id')::uuid,
      (p_step ->> 'end_position_id')::uuid,
      coalesce((p_step ->> 'phrases')::smallint, 1),
      coalesce((p_step ->> 'can_start')::boolean, false),
      coalesce((p_step ->> 'can_end')::boolean, false),
      coalesce((p_step ->> 'repeatable')::boolean, false),
      (p_step ->> 'variation_of')::uuid,
      coalesce((p_step ->> 'sort_order')::smallint, 0)
    )
    returning id into v_id;
  else
    update public.steps set
      slug = p_step ->> 'slug',
      name = p_step ->> 'name',
      description = nullif(btrim(p_step ->> 'description'), ''),
      beat_notes = coalesce(p_step -> 'beat_notes', '[]'::jsonb),
      category = (p_step ->> 'category')::public.step_category,
      difficulty = (p_step ->> 'difficulty')::smallint,
      start_position_id = (p_step ->> 'start_position_id')::uuid,
      end_position_id = (p_step ->> 'end_position_id')::uuid,
      phrases = coalesce((p_step ->> 'phrases')::smallint, 1),
      can_start = coalesce((p_step ->> 'can_start')::boolean, false),
      can_end = coalesce((p_step ->> 'can_end')::boolean, false),
      repeatable = coalesce((p_step ->> 'repeatable')::boolean, false),
      variation_of = (p_step ->> 'variation_of')::uuid,
      sort_order = coalesce((p_step ->> 'sort_order')::smallint, 0)
    where id = p_step_id and style_id = p_style_id
    returning id into v_id;
    if v_id is null then
      raise exception 'paso no encontrado' using errcode = 'P0002';
    end if;
  end if;

  delete from public.step_prerequisites p
  where p.step_id = v_id and not (p.requires_step_id = any (v_prereqs));
  insert into public.step_prerequisites (step_id, requires_step_id)
  select distinct v_id, r from unnest(v_prereqs) as r
  on conflict do nothing;

  return v_id;
end;
$$;

revoke execute on function public.admin_save_step(uuid, uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.admin_save_step(uuid, uuid, jsonb, uuid[]) to authenticated, service_role;
