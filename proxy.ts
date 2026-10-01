import { type NextRequest, NextResponse } from "next/server";
import {
  isGuestOnlyPath,
  isProtectedPath,
  safeNext,
  signInPathFor,
} from "@/lib/auth/redirect";
import {
  MAINTENANCE_PATH,
  maintenanceUntil,
  retryAfterSeconds,
  shouldServeMaintenance,
} from "@/lib/maintenance";
import { redirectWithSession, updateSession } from "@/lib/supabase/proxy";

/**
 * Proxy de Next 16 (antes middleware): refresca la sesión y hace los chequeos **optimistas**
 * de ruta. La autorización de verdad está en `lib/auth/session.ts` (cada página protegida) y
 * en RLS: el proxy solo evita pintar una pantalla que igual iba a rechazar.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Mantenimiento (D111): antes que la sesión, para no tocar Supabase mientras está parado.
  if (shouldServeMaintenance(pathname, process.env))
    return maintenance(request);

  const { response, userId } = await updateSession(request);

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

/** Reescribe a `/maintenance` (la URL del navegador no cambia) con 503 y, si hay hora, `Retry-After`. */
function maintenance(request: NextRequest): NextResponse {
  const response = NextResponse.rewrite(
    new URL(MAINTENANCE_PATH, request.url),
    { status: 503 },
  );
  response.headers.set("Cache-Control", "no-store");
  const retryAfter = retryAfterSeconds(
    maintenanceUntil(process.env),
    new Date(),
  );
  if (retryAfter) response.headers.set("Retry-After", retryAfter);
  return response;
}

export const config = {
  // Todo menos estáticos e imágenes: la sesión se refresca también en las páginas públicas.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
