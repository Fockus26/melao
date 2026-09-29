import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/supabase/functions/_shared/database.types";
import { supabaseEnv } from "./env";

/**
 * Cliente de Supabase para el navegador (formularios de auth). Guarda la sesión en cookies para
 * que el proxy y los Server Components la lean. `createBrowserClient` ya es un singleton.
 */
export function createClient() {
  const { url, publishableKey } = supabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
