import { type NextRequest, NextResponse } from "next/server";
import { AUTH_ROUTES } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Cerrar sesión: solo POST (un GET lo dispararía un prefetch o un enlace ajeno). Borra la
 * sesión de este dispositivo y vuelve a `/login` con 303 para que el navegador haga GET.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL(AUTH_ROUTES.signIn, request.url), 303);
}
