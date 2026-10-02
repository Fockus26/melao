import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import {
  needsOnboarding,
  signInPathFor,
  WELCOME_PATH,
} from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Capa de acceso para Server Components (guía de auth de Next 16: el chequeo va junto a los
 * datos, no solo en el proxy ni en el layout). Memoizada por render con `cache`.
 */

export type SessionUser = { id: string; email: string | null };

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
});

/** Sesión obligatoria: sin ella, a `/login?next=<ruta>`. */
export async function requireUser(path: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(signInPathFor(path));
  return user;
}

/**
 * Perfil propio (RLS: el dueño lee su fila). `null` si aún no existe.
 * `experience_level` no va aquí: se lee solo en la Bienvenida, que es quien lo usa. `theme`
 * sí: la shell de la app lo aplica al cargar (D136).
 */
export const getOwnProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "display_name, app_role, dance_role, default_style_id, theme, onboarded_at",
    )
    .eq("id", userId)
    .maybeSingle();
  return data;
});

/**
 * Sesión + Bienvenida hecha: sin `onboarded_at`, a `/welcome` (D081). Va en cada página de
 * `/app/*`, no en su layout, que no se vuelve a evaluar al navegar.
 */
export async function requireOnboardedUser(path: string): Promise<SessionUser> {
  const user = await requireUser(path);
  const profile = await getOwnProfile(user.id);
  if (needsOnboarding(profile)) redirect(WELCOME_PATH);
  return user;
}

/**
 * Sesión + rol `admin`, leído de `profiles` con la sesión del alumno (RLS), nunca de datos del
 * cliente ni de metadatos editables por el usuario. Sin rol: 404, sin revelar que existe (D073).
 */
export async function requireAdmin(path: string): Promise<SessionUser> {
  const user = await requireUser(path);
  const profile = await getOwnProfile(user.id);
  if (profile?.app_role !== "admin") notFound();
  return user;
}
