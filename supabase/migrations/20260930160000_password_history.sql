-- Historial de contraseñas: la nueva no puede repetir ninguna de las últimas 3 (D106–D108).
-- Contrato: docs/spec/api.md § Acceso (Restablecer) y § Edge Functions (`change-password`).
--
-- * `private.password_history` guarda los hashes **anteriores** (bcrypt de Supabase Auth). Lo
--   alimenta un trigger en `auth.users`: cualquier cambio de contraseña queda registrado, venga
--   de la Edge Function, del panel o de `updateUser`. Se conservan los 2 más recientes: con el
--   hash actual de `auth.users` suman las "últimas 3".
-- * `private.password_recently_used` compara una candidata en claro contra esos 3 hashes con
--   `crypt` (pgcrypto); nunca devuelve un hash. La API no expone `private`: la Edge Function
--   la llama por `public.ef_password_recently_used`, ejecutable solo por service_role (D050).
-- * Sin acceso para anon ni authenticated: ni la tabla ni las funciones.

-- pgcrypto vive en `extensions` en Supabase (ya instalada en el proyecto real).
create extension if not exists pgcrypto with schema extensions;

-- ── Tabla ────────────────────────────────────────────────────────────────────

create table private.password_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  hash text not null,
  created_at timestamptz not null default now()
);

create index password_history_user_created_idx
  on private.password_history (user_id, created_at desc, id desc);

-- `private` tiene `usage` para anon/authenticated (funciones de apoyo de RLS): se cierra la
-- tabla de forma explícita y se activa RLS sin políticas como segunda barrera.
alter table private.password_history enable row level security;
revoke all on table private.password_history from public, anon, authenticated, service_role;

-- ── Trigger en auth.users ────────────────────────────────────────────────────
-- Guarda el hash anterior (si había uno: una cuenta solo de Google no tiene) y poda a los 2
-- más recientes. El dueño de auth.users es supabase_auth_admin: la función es security
-- definer (dueño postgres) para poder escribir en `private`.

create function private.record_password_change() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.encrypted_password is null or old.encrypted_password = ''
     or old.encrypted_password is not distinct from new.encrypted_password then
    return new;
  end if;

  insert into private.password_history (user_id, hash)
  values (old.id, old.encrypted_password);

  delete from private.password_history h
  where h.user_id = old.id
    and h.id not in (
      select k.id from private.password_history k
      where k.user_id = old.id
      order by k.created_at desc, k.id desc
      limit 2
    );

  return new;
end;
$$;

create trigger on_auth_user_password_changed
  after update of encrypted_password on auth.users
  for each row execute function private.record_password_change();

-- ── Comprobación ─────────────────────────────────────────────────────────────
-- true si la candidata coincide con el hash actual o con alguno de los 2 anteriores.

create function private.password_recently_used(p_user uuid, p_candidate text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_candidate is null or p_candidate = '' then
    return false;
  end if;

  return exists (
    select 1
    from (
      select u.encrypted_password as hash
      from auth.users u
      where u.id = p_user
      union all
      select h.hash
      from private.password_history h
      where h.user_id = p_user
    ) recent
    where recent.hash is not null
      and recent.hash <> ''
      and extensions.crypt(p_candidate, recent.hash) = recent.hash
  );
end;
$$;

-- Puente en `public` para la Edge Function (PostgREST solo expone `public`).
create function public.ef_password_recently_used(p_user uuid, p_candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.password_recently_used(p_user, p_candidate)
$$;

-- ── Permisos: solo service_role (la Edge Function) ───────────────────────────

revoke execute on function
  private.record_password_change(),
  private.password_recently_used(uuid, text),
  public.ef_password_recently_used(uuid, text)
from public, anon, authenticated;

grant execute on function
  private.password_recently_used(uuid, text),
  public.ef_password_recently_used(uuid, text)
to service_role;
