/**
 * `change-password` (api.md § Edge Functions, D106–D108).
 *
 * Entrada `{ password }` → `{ ok: true }`. Cambia la contraseña del dueño del JWT (sirve la
 * sesión de recuperación) si cumple la regla (D075) y no es ninguna de las últimas 3
 * (`ef_password_recently_used`). La contraseña nunca se registra ni se devuelve.
 */

import { type AuthPort, requireUserId } from "../_shared/auth.ts";
import { isValidPassword } from "../_shared/core/password.ts";
import { HttpError, jsonEndpoint } from "../_shared/http.ts";
import { invalid, object } from "../_shared/validate.ts";

export interface ChangePasswordPort {
  /** true si coincide con la actual o con alguna de las 2 anteriores. */
  recentlyUsed(userId: string, password: string): Promise<boolean>;
  /** Cambia la contraseña con la API de administración (lanza `HttpError` si Auth la rechaza). */
  updatePassword(userId: string, password: string): Promise<void>;
}

export interface Deps {
  auth: AuthPort;
  data: ChangePasswordPort;
}

/** bcrypt (Supabase Auth) solo mira los primeros 72 bytes: más largo, se rechaza. */
export const PASSWORD_MAX_BYTES = 72;

export const weakPassword = () =>
  new HttpError(
    422,
    "weak_password",
    "La contraseña no cumple los requisitos.",
  );

export const passwordReused = () =>
  new HttpError(
    422,
    "password_reused",
    "Esa contraseña es una de las últimas tres que usaste.",
  );

export function parseInput(body: unknown): { password: string } {
  const input = object(body, "cuerpo");
  const { password } = input;
  if (
    typeof password !== "string" ||
    password.length === 0 ||
    new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES
  ) {
    invalid("password", `un texto de hasta ${PASSWORD_MAX_BYTES} bytes`);
  }
  return { password };
}

export function createHandler(deps: Deps) {
  return jsonEndpoint(async ({ req, body }) => {
    const userId = await requireUserId(req, deps.auth);
    const { password } = parseInput(body);
    if (!isValidPassword(password)) throw weakPassword();
    if (await deps.data.recentlyUsed(userId, password)) throw passwordReused();
    await deps.data.updatePassword(userId, password);
    return { ok: true };
  });
}
