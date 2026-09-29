import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/supabase/functions/_shared/database.types";
import { supabaseEnv } from "./env";

/**
 * Refresca la sesión de Supabase en cada petición (desde `proxy.ts`) y devuelve la respuesta
 * que lleva las cookies nuevas, más el id del usuario si hay sesión válida. Las cookies se
 * escriben en la petición (para el resto de esta petición) y en la respuesta (para el navegador).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  let env: ReturnType<typeof supabaseEnv>;
  try {
    env = supabaseEnv();
  } catch (error) {
    // Sin configuración, el sitio público sigue en pie; lo protegido cae en /login.
    console.error(error);
    return { response, userId: null };
  }
  const { url, publishableKey } = env;

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet)
          request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet)
          response.cookies.set(name, value, options);
        // Cache-Control privado: una respuesta con cookies de sesión nunca va a un CDN.
        for (const [key, value] of Object.entries(headers))
          response.headers.set(key, value);
      },
    },
  });

  // getClaims valida el JWT (firma y vencimiento) y, si venció, lo refresca. No se confía en
  // getSession() en el servidor: lee la cookie sin validarla.
  const { data } = await supabase.auth.getClaims();
  return { response, userId: data?.claims?.sub ?? null };
}

/** Redirección que conserva las cookies (y cabeceras de caché) que dejó `updateSession`. */
export function redirectWithSession(
  to: URL,
  sessionResponse: NextResponse,
): NextResponse {
  const redirect = NextResponse.redirect(to);
  for (const cookie of sessionResponse.cookies.getAll())
    redirect.cookies.set(cookie);
  const cacheControl = sessionResponse.headers.get("Cache-Control");
  if (cacheControl) redirect.headers.set("Cache-Control", cacheControl);
  return redirect;
}
