-- Bienvenida (/welcome): estilos que el alumno eligió, su nivel y el RPC que cierra el
-- onboarding. Aditiva: una tabla, un enum, una columna y una función.
-- Contrato: docs/spec/api.md § Usuarios y suscripción, docs/spec/pantallas.md (Bienvenida).
-- Decisiones: D003 (la regla vive aquí, no en el cliente), D023 (un rol para todos los
-- estilos + estilo por defecto), D080–D083.

-- ── Nivel declarado ──────────────────────────────────────────────────────────
-- `beginner`: empieza desde cero (lección 1). `knows_steps`: ya sabe pasos y los marcará en el
-- catálogo. Mientras no exista el catálogo, los dos van a Inicio (D083).

create type public.experience_level as enum ('beginner', 'knows_steps');

alter table public.profiles add column experience_level public.experience_level;

comment on column public.profiles.experience_level is
  'Nivel declarado en la Bienvenida; null hasta el onboarding. Solo lo escribe complete_onboarding (D083).';

-- Sin `grant update (experience_level)`: el permiso de columna de profiles no lo incluye a
-- propósito; se escribe solo por public.complete_onboarding.

-- ── user_styles ──────────────────────────────────────────────────────────────
-- Estilos que el alumno quiere bailar (uno o varios). Los escribe solo el RPC.

create table public.user_styles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  style_id uuid not null references public.dance_styles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, style_id)
);

create index user_styles_style on public.user_styles (style_id);

alter table public.user_styles enable row level security;

create policy "user_styles: el dueño o un admin leen"
  on public.user_styles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

revoke all on public.user_styles from anon, authenticated;
grant select on public.user_styles to authenticated;
grant select, insert, update, delete on public.user_styles to service_role;

-- ── complete_onboarding ──────────────────────────────────────────────────────
-- Cierra la Bienvenida en una sola transacción (la de la llamada): reemplaza los estilos,
-- guarda rol y nivel, fija el estilo por defecto si no tenía y marca `onboarded_at`.
-- Idempotente: repetirla reescribe todo (sirve también para cambiar la elección).
-- El rol se pide siempre, aunque ningún estilo elegido tenga roles (D080).

create function public.complete_onboarding(
  p_style_ids uuid[],
  p_dance_role public.dance_role,
  p_level public.experience_level
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_styles uuid[];
begin
  if v_user is null then
    raise exception 'hace falta una sesión' using errcode = '42501';
  end if;
  if p_dance_role is null or p_level is null then
    raise exception 'faltan el rol o el nivel' using errcode = '22023';
  end if;

  -- Sin repetidos ni nulos.
  select coalesce(array_agg(distinct s), '{}') into v_styles
  from unnest(p_style_ids) as s
  where s is not null;

  if cardinality(v_styles) = 0 then
    raise exception 'elige al menos un estilo' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(v_styles) as s
    where not exists (
      select 1 from public.dance_styles ds where ds.id = s and ds.published
    )
  ) then
    raise exception 'estilo no disponible' using errcode = '22023';
  end if;

  delete from public.user_styles where user_id = v_user and style_id <> all (v_styles);
  insert into public.user_styles (user_id, style_id)
  select v_user, s from unnest(v_styles) as s
  on conflict do nothing;

  update public.profiles p
  set dance_role = p_dance_role,
      experience_level = p_level,
      -- Se conserva el que tenía si sigue entre los elegidos; si no, el primero por orden.
      default_style_id = case
        when p.default_style_id = any (v_styles) then p.default_style_id
        else (
          select ds.id from public.dance_styles ds
          where ds.id = any (v_styles)
          order by ds.sort_order, ds.name
          limit 1
        )
      end,
      onboarded_at = now()
  where p.id = v_user;

  if not found then
    raise exception 'perfil no encontrado' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.complete_onboarding(uuid[], public.dance_role, public.experience_level)
  from public, anon;
grant execute on function public.complete_onboarding(uuid[], public.dance_role, public.experience_level)
  to authenticated;
