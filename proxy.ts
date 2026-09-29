import type { NextRequest } from "next/server";
import {
  isGuestOnlyPath,
  isProtectedPath,
  safeNext,
  signInPathFor,
} from "@/lib/auth/redirect";
import { redirectWithSession, updateSession } from "@/lib/supabase/proxy";

/**
 * Proxy de Next 16 (antes middleware): refresca la sesión y hace los chequeos **optimistas**
 * de ruta. La autorización de verdad está en `lib/auth/session.ts` (cada página protegida) y
 * en RLS: el proxy solo evita pintar una pantalla que igual iba a rechazar.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!userId && isProtectedPath(pathname))
    return redirectWithSession(
      new URL(signInPathFor(`${pathname}${search}`), request.url),
      response,
    );

  if (userId && isGuestOnlyPath(pathname)) {
    const next = safeNext(request.nextUrl.searchParams.get("next"));
    return redirectWithSession(new URL(next, request.url), response);
  }

  return response;
}

export const config = {
  // Todo menos estáticos e imágenes: la sesión se refresca también en las páginas públicas.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
