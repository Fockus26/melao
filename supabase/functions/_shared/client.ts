/**
 * Cliente de Supabase de las Edge Functions, con la clave secreta (salta RLS): solo servidor.
 *
 * Variables que Supabase inyecta al desplegar (api.md § Edge Functions):
 * - `SUPABASE_URL`.
 * - `SUPABASE_SECRET_KEYS`: diccionario JSON de claves secretas; se usa `default`.
 * - `SUPABASE_SERVICE_ROLE_KEY`: clave heredada (legacy), respaldo si no hay la anterior.
 *
 * Recibe un lector de variables para no depender de `Deno.env` (se prueba desde bun).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.ts";

export type Env = (name: string) => string | undefined;
export type ServiceClient = SupabaseClient<Database>;

export function serviceKey(env: Env): string | undefined {
  const keys = env("SUPABASE_SECRET_KEYS");
  if (keys) {
    try {
      const parsed = JSON.parse(keys) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Formato inesperado: se intenta la clave heredada.
    }
  }
  return env("SUPABASE_SERVICE_ROLE_KEY");
}

export function createServiceClient(env: Env): ServiceClient {
  const url = env("SUPABASE_URL");
  const key = serviceKey(env);
  if (!url || !key) {
    throw new Error(
      "Faltan SUPABASE_URL y SUPABASE_SECRET_KEYS/SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
