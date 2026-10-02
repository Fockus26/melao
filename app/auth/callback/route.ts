import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { resolveEmailChange } from "@/lib/auth/email-change";
import {
  type CallbackErrorReason,
  callbackErrorReason,
} from "@/lib/auth/errors";
import {
  AUTH_ROUTES,
  callbackFailurePath,
  emailChangeResultPath,
  isEmailChangeCallback,
  isRecoveryCallback,
  safeNext,
} from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function isOtpType(value: string | null): value is EmailOtpType {
  return OTP_TYPES.includes(value as EmailOtpType);
}

/**
 * Vuelta de Google y de los enlaces de correo (confirmación, recuperación y cambio de correo).
 * Intercambia el código PKCE (`?code=`) o verifica el token del correo (`?token_hash=&type=`),
 * deja la sesión en cookies y manda a `next` (solo rutas internas). Si algo falla, a
 * `/login?error=<motivo>` (o a `/forgot-password` si venía de recuperar la contraseña), nunca a
 * una página en blanco. El cambio de correo (`type=email_change`) termina siempre en Perfil con
 * el resultado en `?email=` (D134).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type");
  if (isEmailChangeCallback(type)) return emailChange(request);

  const next =
    type === "recovery" ? AUTH_ROUTES.reset : safeNext(params.get("next"));
  // El tipo de enlace decide el motivo (D101): recuperación o confirmación del correo.
  const recovering = isRecoveryCallback(type, next);
  const fail = (reason: CallbackErrorReason) =>
    NextResponse.redirect(
      new URL(callbackFailurePath(recovering, reason), request.url),
    );

  // Supabase vuelve con ?error=…&error_code=… cuando el enlace venció o se canceló el acceso.
  if (params.has("error") || params.has("error_code"))
    return fail(callbackErrorReason(params.get("error_code"), { recovering }));

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  if (!code && !(tokenHash && isOtpType(type))) return fail("missing-code");

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash as string,
        type: type as EmailOtpType,
      });
  if (error) return fail(callbackErrorReason(error.code, { recovering }));

  return NextResponse.redirect(new URL(next, request.url));
}

/** Cambio de correo: siempre a Perfil con el resultado en `?email=` (D134). */
async function emailChange(request: NextRequest) {
  const result = await resolveEmailChange(
    request.nextUrl.searchParams,
    async () => (await createClient()).auth,
  );
  return NextResponse.redirect(
    new URL(emailChangeResultPath(result), request.url),
  );
}
