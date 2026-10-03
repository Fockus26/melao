-- Admin · Usuarios (solo lectura): la lista de alumnos con su plan y el estado de su
-- suscripción, para `/admin/users` y los clientes que vengan. Aditiva salvo `my_subscription`,
-- que pasa a usar la misma regla de estado sin cambiar lo que devuelve.
-- Contrato: docs/spec/api.md § Admin › Usuarios. Decisiones: D003 (la regla vive aquí),
-- D135 (qué suscripción y qué estado), D156 (lectura y búsqueda), D157 (contadores aparte).
--
-- `security definer`: el correo y el último acceso están en `auth.users`, que la RLS no da.
-- Por eso cada función pública comprueba `private.is_admin()` antes de leer nada (si no,
-- 42501) y el anónimo no las ejecuta.

-- ── Estado de una suscripción (una sola regla) ──────────────────────────────
-- La misma condición que has_active_subscription(): solo `active` con el período en curso da
-- acceso. Un `active` con el período vencido se ve como vencido.

create function private.subscription_state(
  p_status public.subscription_status,
  p_current_period_end timestamptz
) returns text
language sql stable
set search_path = ''
as $$
  select case
    when p_status = 'active' and p_current_period_end > now() then 'active'
    when p_status = 'past_due' then 'past_due'
    when p_status = 'canceled' then 'canceled'
    else 'expired'
  end
$$;

revoke execute on function private.subscription_state(public.subscription_status, timestamptz)
  from public;
grant execute on function private.subscription_state(public.subscription_status, timestamptz)
  to authenticated, service_role;

-- my_subscription (20261002140000_profile.sql) con la regla de arriba: mismo resultado.
create or replace function public.my_subscription()
returns table (
  plan_name text,
  price_cents integer,
  currency text,
  billing_interval text,
  status public.subscription_status,
  current_period_end timestamptz,
  canceled_at timestamptz,
  state text
)
language sql stable
security invoker
set search_path = ''
as $$
  select
    p.name,
    p.price_cents,
    p.currency::text,
    p.billing_interval,
    s.status,
    s.current_period_end,
    s.canceled_at,
    private.subscription_state(s.status, s.current_period_end)
  from public.subscriptions s
  left join public.plans p on p.id = s.plan_id
  where s.user_id = (select auth.uid())
  -- La vigente primero; si no hay, la más reciente.
  order by
    (private.subscription_state(s.status, s.current_period_end) = 'active') desc,
    s.current_period_end desc,
    s.created_at desc
  limit 1
$$;

-- ── Texto para buscar ───────────────────────────────────────────────────────
-- Sin acentos ni mayúsculas, como la búsqueda del cliente (`normalizeText`). Sin `unaccent`
-- (no está en las migraciones): `translate` con las letras del español y vecinas, antes de
-- `lower`, para que no dependa del locale de la base.

create function private.search_text(p_text text) returns text
language sql immutable
set search_path = ''
as $$
  select lower(translate(
    coalesce(p_text, ''),
    'ÁÀÂÄÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇáàâäãéèêëíìîïóòôöõúùûüñç',
    'AAAAAEEEEIIIIOOOOOUUUUNCaaaaaeeeeiiiiooooouuuunc'
  ))
$$;

revoke execute on function private.search_text(text) from public;
grant execute on function private.search_text(text) to authenticated, service_role;

-- ── Base de la lista ────────────────────────────────────────────────────────
-- Un usuario por perfil con su correo y la suscripción que vería en Perfil (la vigente o la de
-- período más reciente, D135); `none` sin ninguna. Filtra por la búsqueda: cada palabra tiene
-- que estar en el nombre o en el correo. Privada y sin grants: solo la llaman las funciones
-- `security definer` de abajo, después de comprobar el rol.

create function private.admin_user_rows(p_query text)
returns table (
  user_id uuid,
  display_name text,
  email text,
  app_role public.app_role,
  dance_role public.dance_role,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  plan_name text,
  state text,
  current_period_end timestamptz
)
language sql stable
security definer
set search_path = ''
as $$
  with words as (
    select array_remove(
      regexp_split_to_array(btrim(private.search_text(left(p_query, 120))), '\s+'),
      ''
    ) as list
  )
  select
    pr.id,
    pr.display_name,
    u.email::text,
    pr.app_role,
    pr.dance_role,
    pr.created_at,
    u.last_sign_in_at,
    sub.plan_name,
    coalesce(sub.state, 'none'),
    sub.current_period_end
  from public.profiles pr
  join auth.users u on u.id = pr.id
  cross join words
  left join lateral (
    select
      p.name as plan_name,
      private.subscription_state(s.status, s.current_period_end) as state,
      s.current_period_end
    from public.subscriptions s
    left join public.plans p on p.id = s.plan_id
    where s.user_id = pr.id
    -- El mismo orden que my_subscription().
    order by
      (private.subscription_state(s.status, s.current_period_end) = 'active') desc,
      s.current_period_end desc,
      s.created_at desc
    limit 1
  ) sub on true
  where not exists (
    select 1
    from unnest(words.list) as w (word)
    where strpos(
      private.search_text(coalesce(pr.display_name, '') || ' ' || coalesce(u.email::text, '')),
      w.word
    ) = 0
  )
$$;

revoke execute on function private.admin_user_rows(text) from public, anon, authenticated;

-- ── Lista paginada ──────────────────────────────────────────────────────────

create function public.admin_users(
  p_query text default null,
  p_state text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  display_name text,
  email text,
  app_role public.app_role,
  dance_role public.dance_role,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  plan_name text,
  state text,
  current_period_end timestamptz,
  total_count integer
)
language plpgsql stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'solo un admin lee los usuarios' using errcode = '42501';
  end if;
  if nullif(p_state, '') is not null
     and p_state not in ('active', 'past_due', 'canceled', 'expired', 'none') then
    raise exception 'estado desconocido: %', p_state using errcode = '22023';
  end if;

  return query
  select
    r.user_id,
    r.display_name,
    r.email,
    r.app_role,
    r.dance_role,
    r.created_at,
    r.last_sign_in_at,
    r.plan_name,
    r.state,
    r.current_period_end,
    -- Total con los filtros, antes de cortar la página.
    (count(*) over ())::integer
  from private.admin_user_rows(p_query) r
  where nullif(p_state, '') is null or r.state = p_state
  -- Alta más reciente primero; el id desempata para que las páginas no se pisen.
  order by r.created_at desc, r.user_id
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke execute on function public.admin_users(text, text, integer, integer) from public, anon;
grant execute on function public.admin_users(text, text, integer, integer)
  to authenticated, service_role;

-- ── Contadores de los chips ─────────────────────────────────────────────────
-- Cuántos usuarios hay en cada estado con la búsqueda puesta (sin el filtro de estado): los
-- chips los muestran aunque la página filtrada venga vacía (D157). Una fila.

create function public.admin_user_counts(p_query text default null)
returns table (
  all_count integer,
  active_count integer,
  past_due_count integer,
  canceled_count integer,
  expired_count integer,
  none_count integer
)
language plpgsql stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'solo un admin lee los usuarios' using errcode = '42501';
  end if;

  return query
  select
    count(*)::integer,
    (count(*) filter (where r.state = 'active'))::integer,
    (count(*) filter (where r.state = 'past_due'))::integer,
    (count(*) filter (where r.state = 'canceled'))::integer,
    (count(*) filter (where r.state = 'expired'))::integer,
    (count(*) filter (where r.state = 'none'))::integer
  from private.admin_user_rows(p_query) r;
end;
$$;

revoke execute on function public.admin_user_counts(text) from public, anon;
grant execute on function public.admin_user_counts(text) to authenticated, service_role;
