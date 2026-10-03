-- Stub mínimo de Supabase para correr las migraciones en PGlite (D037).
-- Replica solo lo que las migraciones usan: roles de la API, esquema auth con
-- auth.users (con encrypted_password y last_sign_in_at) y auth.uid()/auth.jwt(), pgcrypto en `extensions`, y
-- los permisos por defecto del esquema public.
-- No es Supabase: Auth, Storage y PostgREST quedan fuera.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;

-- pgcrypto en `extensions`, como en Supabase (el arnés carga la extensión de PGlite).
create schema extensions;
create extension pgcrypto with schema extensions;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now()
);

-- Igual que en Supabase: el sub y los claims del JWT llegan como settings de la sesión.
create function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create function auth.jwt() returns jsonb
language sql stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;

-- Permisos por defecto de Supabase sobre public para anon y authenticated (las migraciones
-- revocan lo que no corresponde). service_role queda sin defaults a propósito: así los tests
-- prueban que cada migración le concede lo suyo (auto_expose_new_tables = false).
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;

-- Storage: solo las tablas y permisos que usan las políticas de las migraciones.
create schema storage;
grant usage on schema storage to anon, authenticated, service_role;

create table storage.buckets (
  id text primary key,
  name text not null unique,
  public boolean not null default false
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now(),
  unique (bucket_id, name)
);

alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
