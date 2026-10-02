/**
 * Rutas de la autenticación y destino tras entrar. Puro: sin React ni Next, para probarlo con
 * `bun test` y portarlo tal cual a Android/iOS (docs/spec/api.md § Acceso).
 */
import { matchesPath } from "@/lib/navigation";

/**
 * Destino por defecto al entrar o registrarse. Quien no hizo la Bienvenida sale de `/app` a
 * `/welcome` (D081): así el desvío vale igual para correo, Google y los enlaces de correo.
 */
export const DEFAULT_AFTER_AUTH = "/app";

/** Bienvenida: estilos, rol y nivel. Exige sesión; con el onboarding hecho, a Inicio. */
export const WELCOME_PATH = "/welcome";

export const AUTH_ROUTES = {
  signIn: "/login",
  signUp: "/register",
  forgot: "/forgot-password",
  reset: "/reset-password",
  callback: "/auth/callback",
  signOut: "/auth/logout",
} as const;

/** Todo lo que cuelga de estos prefijos exige sesión; `/admin` además exige rol admin. */
export const PROTECTED_PREFIXES = [
  "/app",
  "/admin",
  WELCOME_PATH,
  "/checkout",
] as const;

/** Con sesión, estas pantallas mandan directo al destino (no tiene sentido volver a entrar). */
export const GUEST_ONLY_PATHS = [
  AUTH_ROUTES.signIn,
  AUTH_ROUTES.signUp,
] as const;

export function isProtectedPath(path: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => matchesPath(path, prefix));
}

/**
 * ¿Falta la Bienvenida? Sí mientras `profiles.onboarded_at` sea null (lo pone solo
 * `complete_onboarding`). Sin perfil legible también: la Bienvenida lo resuelve o avisa.
 */
export function needsOnboarding(
  profile: { onboarded_at: string | null } | null | undefined,
): boolean {
  return !profile?.onboarded_at;
}

export function isGuestOnlyPath(path: string): boolean {
  return GUEST_ONLY_PATHS.some((p) => matchesPath(path, p));
}

// Base ficticia para resolver rutas relativas: si al resolverla cambia el origen, `next`
// apuntaba fuera del sitio ("//evil.com", "/\\evil.com", "https://…").
const PROBE_ORIGIN = "http://melao.invalid";

/**
 * `next` seguro: solo rutas internas absolutas (`/app/course?x=1`). Cualquier otra cosa
 * (URL externa, `//host`, barras invertidas, caracteres de control, las propias pantallas de
 * auth, que harían un bucle) devuelve `fallback`. Evita el open redirect.
 */
export function safeNext(
  value: string | null | undefined,
  fallback: string = DEFAULT_AFTER_AUTH,
): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512)
    return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  // Barras invertidas y caracteres de control: los navegadores los normalizan a "/".
  // biome-ignore lint/suspicious/noControlCharactersInRegex: se buscan justamente los de control.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  let url: URL;
  try {
    url = new URL(value, PROBE_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== PROBE_ORIGIN) return fallback;
  const path = url.pathname;
  // "/app/../..//evil.com" se resuelve a "//evil.com": como destino sería otro origen.
  if (path.startsWith("//")) return fallback;
  if (
    isGuestOnlyPath(path) ||
    matchesPath(path, "/auth") ||
    matchesPath(path, AUTH_ROUTES.forgot)
  )
    return fallback;
  return `${path}${url.search}${url.hash}`;
}

/** `/login?next=<ruta>` para mandar a entrar a quien pidió una ruta protegida. */
export function signInPathFor(pathWithSearch: string): string {
  const next = safeNext(pathWithSearch, "");
  return next && next !== DEFAULT_AFTER_AUTH
    ? `${AUTH_ROUTES.signIn}?next=${encodeURIComponent(next)}`
    : AUTH_ROUTES.signIn;
}

/**
 * URL de `/auth/callback` a la que vuelven Google y los enlaces de correo, con el destino
 * final en `next`. `origin` es `NEXT_PUBLIC_SITE_URL` (o el origen actual si falta).
 */
export function callbackUrl(origin: string, next?: string): string {
  const url = new URL(AUTH_ROUTES.callback, origin);
  const target = safeNext(next);
  if (target !== DEFAULT_AFTER_AUTH) url.searchParams.set("next", target);
  return url.toString();
}

/** ¿El callback viene de recuperar la contraseña? Por `type=recovery` o por `next`. */
export function isRecoveryCallback(
  type: string | null | undefined,
  next: string,
): boolean {
  return type === "recovery" || next === AUTH_ROUTES.reset;
}

/**
 * A dónde vuelve un callback fallido: a `/forgot-password` si era recuperación (ahí se pide
 * otro enlace) y a `/login` en todo lo demás, con el motivo en `?error=`.
 */
export function callbackFailurePath(
  recovering: boolean,
  reason: string,
): string {
  const base = recovering ? AUTH_ROUTES.forgot : AUTH_ROUTES.signIn;
  return `${base}?error=${encodeURIComponent(reason)}`;
}

/** Perfil: ahí vuelve el enlace de cambio de correo, con el resultado en `?email=`. */
export const PROFILE_PATH = "/app/profile";

/**
 * URL de vuelta del cambio de correo (`updateUser({ email }, { emailRedirectTo })`): el
 * callback reconoce el tipo por `type=email_change` y termina siempre en Perfil (D134).
 */
export function emailChangeCallbackUrl(origin: string): string {
  const url = new URL(AUTH_ROUTES.callback, origin);
  url.searchParams.set("type", "email_change");
  return url.toString();
}

export function isEmailChangeCallback(type: string | null | undefined) {
  return type === "email_change";
}

/**
 * Resultados del enlace de cambio de correo, estables y cortos (van en la URL y los comparten
 * las tres plataformas): `changed` (confirmado), `confirm-other` (con el cambio seguro falta
 * abrir el enlace del otro correo) y los motivos de error del callback.
 */
export const EMAIL_CHANGE_RESULTS = [
  "changed",
  "confirm-other",
  "link-expired",
  "other-browser",
  "access-failed",
] as const;
export type EmailChangeResult = (typeof EMAIL_CHANGE_RESULTS)[number];

export function isEmailChangeResult(
  value: unknown,
): value is EmailChangeResult {
  return EMAIL_CHANGE_RESULTS.includes(value as EmailChangeResult);
}

/** `/app/profile?email=<resultado>`. */
export function emailChangeResultPath(result: EmailChangeResult): string {
  return `${PROFILE_PATH}?email=${result}`;
}
