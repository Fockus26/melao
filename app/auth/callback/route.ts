import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import {
  type CallbackErrorReason,
  callbackErrorReason,
} from "@/lib/auth/errors";
import { AUTH_ROUTES, safeNext } from "@/lib/auth/redirect";
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
 * Vuelta de Google y de los enlaces de correo (confirmación y recuperación). Intercambia el
 * código PKCE (`?code=`) o verifica el token del correo (`?token_hash=&type=`), deja la sesión
 * en cookies y manda a `next` (solo rutas internas). Si algo falla, a `/login?error=<motivo>`
 * (o a `/forgot-password` si venía de recuperar la contraseña), nunca a una página en blanco.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type");
  const recovering = type === "recovery";
  const next = recovering ? AUTH_ROUTES.reset : safeNext(params.get("next"));
  const fail = (reason: CallbackErrorReason) =>
    NextResponse.redirect(
      new URL(
        `${next === AUTH_ROUTES.reset ? AUTH_ROUTES.forgot : AUTH_ROUTES.signIn}?error=${reason}`,
        request.url,
      ),
    );

  // Supabase vuelve con ?error=…&error_code=… cuando el enlace venció o se canceló el acceso.
  if (params.has("error") || params.has("error_code"))
    return fail(callbackErrorReason(params.get("error_code")));

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
  if (error) return fail(callbackErrorReason(error.code));

  return NextResponse.redirect(new URL(next, request.url));
}
