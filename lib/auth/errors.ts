/**
 * Errores de Supabase Auth en español humano. Puro: recibe el `code`/`status` del error (no la
 * instancia) para probarlo sin red y portar la tabla a Android/iOS (docs/spec/api.md § Acceso).
 * Copy provisional: mensajes de auth (CONTENT_CHECKLIST fila 42).
 */

export type AuthErrorLike = {
  code?: string | null;
  status?: number | null;
  name?: string | null;
  message?: string | null;
};

/** Qué campo marcar en error (además del banner), si alguno. */
export type AuthErrorField = "email" | "password" | "name" | null;

export type AuthErrorCopy = { message: string; field: AuthErrorField };

const GENERIC: AuthErrorCopy = {
  message: "Algo salió mal de nuestro lado. Inténtalo de nuevo en un momento.",
  field: null,
};

const OFFLINE: AuthErrorCopy = {
  message:
    "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  field: null,
};

const RATE_LIMIT: AuthErrorCopy = {
  message:
    "Hiciste demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.",
  field: null,
};

const EXPIRED_LINK: AuthErrorCopy = {
  message:
    "El enlace venció o ya se usó. Pide uno nuevo y ábrelo en este mismo navegador.",
  field: null,
};

/** Códigos de https://supabase.com/docs/guides/auth/debugging/error-codes que la UI distingue. */
const BY_CODE: Record<string, AuthErrorCopy> = {
  invalid_credentials: {
    message:
      "El correo o la contraseña no coinciden. Revísalos e inténtalo otra vez.",
    field: "password",
  },
  email_not_confirmed: {
    message:
      "Aún no confirmas tu correo. Abre el enlace que te enviamos para activar tu cuenta.",
    field: "email",
  },
  user_already_exists: {
    message:
      "Ya hay una cuenta con ese correo. Entra con él o recupera tu contraseña.",
    field: "email",
  },
  email_exists: {
    message:
      "Ya hay una cuenta con ese correo. Entra con él o recupera tu contraseña.",
    field: "email",
  },
  weak_password: {
    message:
      "Esa contraseña es muy débil o apareció en filtraciones conocidas. Elige otra.",
    field: "password",
  },
  same_password: {
    message: "La nueva contraseña debe ser distinta de la anterior.",
    field: "password",
  },
  // Edge Function change-password (D106). Copy provisional: CONTENT_CHECKLIST fila 60.
  password_reused: {
    message:
      "Esa contraseña ya la usaste hace poco. Elige una distinta a las últimas tres.",
    field: "password",
  },
  email_address_invalid: {
    message: "Ese correo no es válido. Revisa que esté bien escrito.",
    field: "email",
  },
  validation_failed: {
    message: "Revisa los datos: algún campo no tiene el formato esperado.",
    field: null,
  },
  signup_disabled: {
    message: "El registro está cerrado por ahora.",
    field: null,
  },
  email_provider_disabled: {
    message: "Entrar con correo está desactivado por ahora. Usa Google.",
    field: null,
  },
  provider_disabled: {
    message: "Ese método de acceso está desactivado por ahora.",
    field: null,
  },
  over_request_rate_limit: RATE_LIMIT,
  over_email_send_rate_limit: {
    message:
      "Ya te enviamos varios correos. Espera unos minutos antes de pedir otro.",
    field: null,
  },
  otp_expired: EXPIRED_LINK,
  flow_state_expired: EXPIRED_LINK,
  flow_state_not_found: EXPIRED_LINK,
  bad_code_verifier: EXPIRED_LINK,
  session_not_found: {
    message: "Tu sesión terminó. Vuelve a entrar para continuar.",
    field: null,
  },
  session_expired: {
    message: "Tu sesión terminó. Vuelve a entrar para continuar.",
    field: null,
  },
  bad_oauth_state: {
    message: "No pudimos completar el acceso con Google. Inténtalo de nuevo.",
    field: null,
  },
  bad_oauth_callback: {
    message: "No pudimos completar el acceso con Google. Inténtalo de nuevo.",
    field: null,
  },
};

export function authErrorCopy(
  error: AuthErrorLike | null | undefined,
): AuthErrorCopy {
  if (!error) return GENERIC;
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
  if (error.status === 429) return RATE_LIMIT;
  // supabase-js marca con este nombre los fallos de red (sin respuesta del servidor).
  if (error.name === "AuthRetryableFetchError" || error.status === 0)
    return OFFLINE;
  return GENERIC;
}

/**
 * Motivos con los que `/auth/callback` devuelve a `/login?error=<motivo>`. Cortos y estables:
 * van en la URL y los comparten las tres plataformas.
 */
export const CALLBACK_ERRORS = {
  "link-expired": EXPIRED_LINK.message,
  "missing-code":
    "El enlace está incompleto. Pide uno nuevo o entra con tu correo y contraseña.",
  google: "No pudimos completar el acceso con Google. Inténtalo de nuevo.",
  // PKCE: el enlace se abrió en un navegador distinto del que lo pidió. Un motivo por tipo de
  // enlace (D101), para decir solo lo que aplica. Copy provisional (CONTENT_CHECKLIST fila 59).
  // Confirmación: Supabase ya confirmó el correo antes de volver, así que basta con entrar.
  "other-browser-signup":
    "Abriste el enlace en otro navegador, pero tu correo ya quedó confirmado. Entra con tu correo y contraseña.",
  // Recuperación: sin el verificador no hay sesión de recuperación; hace falta otro enlace.
  "other-browser-recovery":
    "Abriste el enlace en otro navegador. Pide uno nuevo aquí y ábrelo en este mismo navegador.",
  // Alias de los enlaces enviados antes de D101: se lee como el de confirmación (va a /login).
  "other-browser":
    "Abriste el enlace en otro navegador, pero tu correo ya quedó confirmado. Entra con tu correo y contraseña.",
  "access-failed": GENERIC.message,
} as const;

export type CallbackErrorReason = keyof typeof CALLBACK_ERRORS;

export function isCallbackErrorReason(
  value: unknown,
): value is CallbackErrorReason {
  return typeof value === "string" && Object.hasOwn(CALLBACK_ERRORS, value);
}

/**
 * Motivo para la URL a partir del error del intercambio de código o de los parámetros
 * `error`/`error_code` con los que Supabase vuelve al callback. `recovering`: el enlace era de
 * recuperación de contraseña (destino `/reset-password` o `type=recovery`); si no, se trata
 * como confirmación del correo (D101).
 */
export function callbackErrorReason(
  code: string | null | undefined,
  { recovering = false }: { recovering?: boolean } = {},
): CallbackErrorReason {
  if (
    code === "otp_expired" ||
    code === "flow_state_expired" ||
    code === "flow_state_not_found" ||
    code === "bad_code_verifier"
  )
    return "link-expired";
  if (code === "pkce_code_verifier_not_found")
    return recovering ? "other-browser-recovery" : "other-browser-signup";
  if (code === "bad_oauth_state" || code === "bad_oauth_callback")
    return "google";
  return "access-failed";
}

// ── Cambio de correo (Perfil, D134) ──────────────────────────────────────────

/** Resultado del enlace de cambio de correo a partir del código de error del callback. */
export function emailChangeErrorResult(
  code: string | null | undefined,
): "link-expired" | "other-browser" | "access-failed" {
  const reason = callbackErrorReason(code);
  if (reason === "link-expired") return "link-expired";
  if (reason === "other-browser-signup") return "other-browser";
  return "access-failed";
}

/**
 * Aviso de Perfil para cada resultado de `/app/profile?email=…`. Copy provisional
 * (CONTENT_CHECKLIST fila 75).
 */
export const EMAIL_CHANGE_NOTICES = {
  changed: {
    tone: "success",
    title: "Correo actualizado",
    text: "Desde ahora entras con tu correo nuevo.",
  },
  "confirm-other": {
    tone: "info",
    title: "Falta un paso",
    text: "Confirmaste uno de los dos enlaces. Abre el que te enviamos al otro correo para terminar el cambio.",
  },
  "link-expired": {
    tone: "error",
    title: "El enlace venció o ya se usó",
    text: "Tu correo no cambió. Vuelve a pedir el cambio y abre el enlace en este mismo navegador.",
  },
  // PKCE sin verificador: Supabase ya aplicó el cambio antes de volver; solo falta la sesión.
  "other-browser": {
    tone: "info",
    title: "Abriste el enlace en otro navegador",
    text: "El cambio quedó confirmado. Si aquí todavía ves el correo anterior, sal y entra con el nuevo.",
  },
  "access-failed": {
    tone: "error",
    title: "No pudimos confirmar el cambio",
    text: "Tu correo no cambió. Inténtalo de nuevo en un momento.",
  },
} as const;

/**
 * Error de `updateUser({ email })` en español. Parte de la tabla general y cambia lo que allí
 * habla de entrar o recuperar la contraseña (aquí ya hay sesión). Copy provisional
 * (CONTENT_CHECKLIST fila 75).
 */
export function emailChangeErrorCopy(
  error: AuthErrorLike | null | undefined,
): AuthErrorCopy {
  switch (error?.code) {
    case "email_exists":
    case "user_already_exists":
      return {
        message: "Ya hay una cuenta con ese correo. Usa otro.",
        field: "email",
      };
    // El correo de Supabase por defecto solo envía a direcciones autorizadas.
    case "email_address_not_authorized":
      return {
        message:
          "Por ahora no podemos enviar correos a esa dirección. Prueba con otra o inténtalo más tarde.",
        field: "email",
      };
    default:
      return authErrorCopy(error);
  }
}
