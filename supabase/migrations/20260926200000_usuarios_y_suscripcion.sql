-- 07a·2 (1/3) — Usuarios, planes y suscripción.
-- Contrato: docs/spec/api.md. Decisiones: D003 (reglas en la base), D013/D015/D017, D029, D036.
--
-- Convenciones de este esquema:
-- * RLS activado en toda tabla; políticas por rol (`to authenticated` / `to anon`).
-- * Supabase concede ALL sobre public a anon y authenticated por defecto: cada tabla revoca
--   lo que el cliente no debe hacer, además de sus políticas (doble cerrojo).
-- * auth.uid() se envuelve en (select …) para que Postgres lo evalúe una vez por consulta.
-- * Funciones de apoyo de RLS en el esquema `private` (no expuesto por la API),
--   security definer y search_path vacío.

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- ── Tipos ────────────────────────────────────────────────────────────────────

create type public.app_role as enum ('student', 'teacher', 'admin');
create type public.dance_role as enum ('leader', 'follower');
create type public.theme_pref as enum ('system', 'light', 'dark');
create type public.client_platform as enum ('web', 'android', 'ios');
create type public.subscription_status as enum ('active', 'past_due', 'canceled', 'expired');
create type public.subscription_provider as enum ('placeholder', 'stripe', 'google_play', 'app_store');

-- ── updated_at ───────────────────────────────────────────────────────────────

create function private.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Uno por usuario de Auth; lo crea el trigger on_auth_user_created.
-- El alumno edita sus preferencias; app_role solo lo cambia un admin (D017).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  app_role public.app_role not null default 'student',
  dance_role public.dance_role,
  theme public.theme_pref not null default 'system',
  coach_voice_volume smallint not null default 80 check (coach_voice_volume between 0 and 100),
  coach_spoken_count boolean not null default true,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.dance_role is 'Rol de baile para todos los estilos (D023); null hasta el onboarding.';
comment on column public.profiles.coach_spoken_count is 'Cuenta hablada sí/no (motor-de-ritmo §6).';

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

create function private.is_admin() returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and app_role = 'admin'
  )
$$;

alter table public.profiles enable row level security;

create policy "profiles: el dueño o un admin leen"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy "profiles: el dueño edita sus preferencias"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "profiles: un admin edita cualquiera"
  on public.profiles for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, dance_role, theme, coach_voice_volume, coach_spoken_count, onboarded_at)
  on public.profiles to authenticated;

-- Un admin cambia app_role por una función aparte: el permiso de columna no alcanza a
-- app_role para authenticated, así que ni un admin lo toca con un UPDATE directo.
create function public.set_app_role(target uuid, new_role public.app_role) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'solo un admin cambia roles' using errcode = '42501';
  end if;
  update public.profiles set app_role = new_role where id = target;
end;
$$;

revoke execute on function public.set_app_role(uuid, public.app_role) from public, anon;
grant execute on function public.set_app_role(uuid, public.app_role) to authenticated;

create function private.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 80), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ── audio_latency ────────────────────────────────────────────────────────────
-- Calibración por dispositivo de salida (D032): solo la UI y los toques la usan.

create table public.audio_latency (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform public.client_platform not null,
  device_key text not null check (char_length(device_key) between 1 and 120),
  device_label text check (char_length(device_label) <= 120),
  offset_ms integer not null check (offset_ms between -200 and 1000),
  sd_ms real check (sd_ms >= 0),
  taps smallint check (taps > 0),
  measured_at timestamptz not null default now(),
  unique (user_id, platform, device_key)
);

comment on column public.audio_latency.device_key is 'Identificador estable del dispositivo de salida en esa plataforma (p. ej. "speaker", "bluetooth:<nombre>").';

alter table public.audio_latency enable row level security;

create policy "audio_latency: el dueño lee"
  on public.audio_latency for select to authenticated
  using (user_id = (select auth.uid()));
create policy "audio_latency: el dueño crea"
  on public.audio_latency for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "audio_latency: el dueño edita"
  on public.audio_latency for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "audio_latency: el dueño borra"
  on public.audio_latency for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.audio_latency from anon, authenticated;
grant select, insert, update, delete on public.audio_latency to authenticated;

-- ── plans ────────────────────────────────────────────────────────────────────
-- Precios en centavos de USD (D029). Lectura pública: la página de Planes no exige cuenta.
-- El precio de checkout sale de aquí, nunca del cliente (activate-subscription).

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 60),
  price_cents integer not null check (price_cents >= 0),
  currency char(3) not null default 'USD',
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  includes_coaching boolean not null default false,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plans_updated_at before update on public.plans
  for each row execute function private.set_updated_at();

alter table public.plans enable row level security;

create policy "plans: todos leen los activos"
  on public.plans for select to anon, authenticated
  using (is_active or (select private.is_admin()));
create policy "plans: un admin crea"
  on public.plans for insert to authenticated
  with check ((select private.is_admin()));
create policy "plans: un admin edita"
  on public.plans for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

revoke all on public.plans from anon, authenticated;
grant select on public.plans to anon, authenticated;
grant insert, update on public.plans to authenticated;

insert into public.plans (slug, name, price_cents, includes_coaching, sort_order) values
  ('basico', 'Básico', 2000, false, 1),
  ('consultoria', 'Consultoría', 4000, true, 2);

-- ── subscriptions ────────────────────────────────────────────────────────────
-- El cliente no escribe nunca (D015): solo Edge Functions con service_role.

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  status public.subscription_status not null,
  provider public.subscription_provider not null,
  provider_ref text,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_period_end > current_period_start)
);

create unique index subscriptions_one_active_per_user
  on public.subscriptions (user_id) where status in ('active', 'past_due');
create index subscriptions_user_id on public.subscriptions (user_id);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function private.set_updated_at();

alter table public.subscriptions enable row level security;

create policy "subscriptions: el dueño o un admin leen"
  on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

-- ¿Tiene acceso al contenido? La usan las políticas del contenido (D036) y los clientes.
create function public.has_active_subscription() returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = (select auth.uid())
      and status = 'active'
      and current_period_end > now()
  )
$$;

revoke execute on function public.has_active_subscription() from public, anon;
grant execute on function public.has_active_subscription() to authenticated;

revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- Las Edge Functions usan service_role. Permisos explícitos: no dependen de que el proyecto
-- exponga las tablas nuevas por defecto (auto_expose_new_tables).
grant select, insert, update, delete
  on public.profiles, public.audio_latency, public.plans, public.subscriptions
  to service_role;
grant execute on function public.has_active_subscription(), public.set_app_role(uuid, public.app_role)
  to service_role;
