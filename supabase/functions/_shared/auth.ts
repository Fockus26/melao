/**
 * Quién llama: el alumno sale del JWT del header `Authorization`, nunca del cuerpo.
 *
 * `AuthPort` separa la verificación del SDK: en producción es `supabase.auth.getUser(jwt)`
 * (valida firma y sesión contra Auth); en los tests, un puerto falso.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "./http.ts";

export interface AuthPort {
  /** Id del usuario dueño del JWT, o `null` si el token no es una sesión válida. */
  userIdFromJwt(jwt: string): Promise<string | null>;
}

/** Token de `Authorization: Bearer <jwt>`; 401 si falta. */
export function bearerToken(req: Request): string {
  const header = req.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) {
    throw new HttpError(401, "unauthorized", "Falta la sesión.");
  }
  return match[1];
}

/** Id del alumno que llama; 401 si no hay sesión válida. */
export async function requireUserId(
  req: Request,
  auth: AuthPort,
): Promise<string> {
  const userId = await auth.userIdFromJwt(bearerToken(req));
  if (!userId) {
    throw new HttpError(401, "unauthorized", "La sesión no es válida.");
  }
  return userId;
}

export function supabaseAuth(client: Pick<SupabaseClient, "auth">): AuthPort {
  return {
    async userIdFromJwt(jwt) {
      const { data, error } = await client.auth.getUser(jwt);
      if (error || !data.user) return null;
      return data.user.id;
    },
  };
}
