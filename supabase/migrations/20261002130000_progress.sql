-- Progreso (`/app/progress`): lecturas con reglas que cada cliente (web, Android, iOS) llama
-- igual. Aditiva: solo funciones. Contrato: docs/spec/api.md § Datos del alumno › Funciones.
-- Decisiones: D003 (la regla vive aquí), D023/D051 (rol de la tarjeta, `private.card_role`),
-- D130 (próximos repasos por día de calendario del dispositivo), D131 (pasos por estado).
--
-- `security invoker`: RLS decide lo visible (pasos publicados; datos del alumno, los suyos y,
-- para un admin, los de todos). Por eso el alumno sale siempre de `auth.uid()` y se filtra por
-- él explícitamente: el admin ve aquí solo lo suyo, como cualquier alumno.

-- ── review_forecast: repasos que vencen en los próximos días ─────────────────
-- Una fila por día de calendario en la zona del dispositivo (`p_tz`, IANA, la manda el
-- cliente), de hoy a hoy + p_days − 1, también los días sin repasos (`due_count = 0`). Cuenta
-- las tarjetas del rol del alumno en el estilo (D051) de pasos publicados; **hoy** incluye las
-- ya vencidas (`due_at` antes de hoy). `p_days` se acota a 1…14. Zona desconocida → error
-- `22023` (la manda el cliente desde `Intl`, así que no se inventa una por defecto).

create function public.review_forecast(
  p_style_id uuid,
  p_days integer default 7,
  p_tz text default 'UTC'
)
returns table (day date, due_count integer)
language sql stable
security invoker
set search_path = ''
as $$
  with params as (
    select
      (now() at time zone p_tz)::date as today,
      greatest(1, least(coalesce(p_days, 7), 14)) as days
  ),
  cards as (
    select greatest((c.due_at at time zone p_tz)::date, (select today from params)) as day
    from public.srs_cards c
    join public.steps s on s.id = c.step_id
    where c.user_id = (select auth.uid())
      and s.style_id = p_style_id
      and s.published
      and c.role = private.card_role((select auth.uid()), p_style_id)
  )
  select
    d.day::date,
    (select count(*) from cards c where c.day = d.day::date)::integer
  from params p
  cross join lateral generate_series(p.today, p.today + (p.days - 1), interval '1 day') as d(day)
  order by d.day
$$;

-- ── step_status_counts: pasos del estilo por estado ──────────────────────────
-- Sobre los pasos **publicados** del estilo (los que ve el alumno): cuántos marcó como
-- aprendiendo o me lo sé en `user_steps.status`; el resto (sin fila o `unknown`) es "no lo sé".
-- Siempre una fila (ceros si el estilo no tiene pasos).

create function public.step_status_counts(p_style_id uuid)
returns table (
  unknown_count integer,
  learning_count integer,
  known_count integer,
  total integer
)
language sql stable
security invoker
set search_path = ''
as $$
  select
    count(*) filter (where coalesce(us.status, 'unknown') = 'unknown')::integer,
    count(*) filter (where us.status = 'learning')::integer,
    count(*) filter (where us.status = 'known')::integer,
    count(*)::integer
  from public.steps s
  left join public.user_steps us
    on us.step_id = s.id and us.user_id = (select auth.uid())
  where s.style_id = p_style_id and s.published
$$;

-- ── Permisos: alumno y admin; anónimo no ────────────────────────────────────

revoke execute on function
  public.review_forecast(uuid, integer, text), public.step_status_counts(uuid)
  from public, anon;
grant execute on function
  public.review_forecast(uuid, integer, text), public.step_status_counts(uuid)
  to authenticated;
