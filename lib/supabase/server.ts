import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/supabase/functions/_shared/database.types";
import { supabaseEnv } from "./env";

/**
 * Cliente de Supabase para Server Components y Route Handlers: uno nuevo por petición, nunca
 * compartido. Actúa como el alumno (clave publicable + su sesión), así que RLS decide qué ve.
 */
export async function createClient() {
  // cookies() primero: marca la ruta como dinámica antes de tocar el entorno (el build no la
  // prerenderiza aunque falten las variables, como en CI).
  const cookieStore = await cookies();
  const { url, publishableKey } = supabaseEnv();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet)
            cookieStore.set(name, value, options);
        } catch {
          // Desde un Server Component no se pueden escribir cookies; el proxy ya refrescó la
          // sesión en esta misma petición, así que no se pierde nada.
        }
      },
    },
  });
}
