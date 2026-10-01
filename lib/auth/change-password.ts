import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { type AuthErrorCopy, authErrorCopy } from "./errors";

/**
 * Restablecer/cambiar la contraseña por la Edge Function `change-password` (D106): la nueva no
 * puede ser ninguna de las últimas 3. Nunca con `auth.updateUser` directo, que salta el
 * historial. Devuelve `null` si se guardó o el mensaje para la UI.
 */
export async function changePassword(
  password: string,
): Promise<AuthErrorCopy | null> {
  try {
    const { error } = await createClient().functions.invoke("change-password", {
      body: { password },
    });
    if (!error) return null;
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      return changePasswordErrorCopy(
        res.status,
        await res.json().catch(() => null),
      );
    }
    if (error instanceof FunctionsFetchError)
      return changePasswordErrorCopy(0, null);
    if (error instanceof FunctionsRelayError)
      return changePasswordErrorCopy(502, null);
    return changePasswordErrorCopy(500, null);
  } catch {
    return changePasswordErrorCopy(0, null);
  }
}

/**
 * Respuesta de `change-password` → mensaje. Puro (las nativas portan la misma tabla): los
 * códigos de la función (`password_reused`, `weak_password`) usan la tabla de auth; sin sesión
 * → "tu sesión terminó"; sin conexión → offline; lo demás, genérico.
 */
export function changePasswordErrorCopy(
  status: number,
  body: unknown,
): AuthErrorCopy {
  const code =
    typeof body === "object" && body !== null
      ? (body as { error?: { code?: unknown } }).error?.code
      : undefined;
  if (status === 401) return authErrorCopy({ code: "session_expired" });
  return authErrorCopy({
    code: typeof code === "string" ? code : null,
    status,
  });
}
