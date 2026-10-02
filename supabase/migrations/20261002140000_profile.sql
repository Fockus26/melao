-- Perfil (07b): la suscripción del alumno tal como la muestra Perfil, una lectura que cada
-- cliente (web, Android, iOS) llama igual. Aditiva: solo una función.
-- Contrato: docs/spec/api.md § Datos del alumno › Perfil. Decisiones: D003 (la regla vive
-- aquí), D036 (acceso = has_active_subscription), D135 (qué suscripción y qué estado se ven).
--
-- `security invoker`: RLS decide lo visible (la suscripción, solo la suya; el admin lee las de
-- todos, por eso el filtro por `auth.uid()`). El plan va con `left join`: un plan que dejó de
-- estar activo no lo lee el alumno, y la suscripción igual se muestra (sin nombre).

create function public.my_subscription()
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
    -- La misma condición que has_active_subscription(): solo `active` con el período en curso
    -- da acceso. Un `active` con el período vencido se ve como vencido.
    case
      when s.status = 'active' and s.current_period_end > now() then 'active'
      when s.status = 'past_due' then 'past_due'
      when s.status = 'canceled' then 'canceled'
      else 'expired'
    end
  from public.subscriptions s
  left join public.plans p on p.id = s.plan_id
  where s.user_id = (select auth.uid())
  -- La vigente primero; si no hay, la más reciente.
  order by
    (s.status = 'active' and s.current_period_end > now()) desc,
    s.current_period_end desc,
    s.created_at desc
  limit 1
$$;

revoke execute on function public.my_subscription() from public, anon;
grant execute on function public.my_subscription() to authenticated, service_role;
