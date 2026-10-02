/**
 * Vuelta del enlace de cambio de correo (D134). Pura salvo por los dos métodos de Auth que
 * recibe, para probarla sin red y portarla a Android/iOS (deep link al mismo flujo).
 *
 * Con "Secure email change" Supabase envía un enlace al correo actual y otro al nuevo: el
 * primero que se abre vuelve sin código y con `?message=` (falta el otro); el último, con `code`
 * (PKCE, plantilla con `{{ .ConfirmationURL }}`) o con `token_hash` (plantilla con token).
 */
import { emailChangeErrorResult } from "./errors";
import type { EmailChangeResult } from "./redirect";

type AuthResult = {
  data?: { user?: unknown } | null;
  error: { code?: string | null } | null;
};

export type EmailChangeAuth = {
  exchangeCodeForSession: (code: string) => Promise<AuthResult>;
  verifyOtp: (params: {
    token_hash: string;
    type: "email_change";
  }) => Promise<AuthResult>;
};

export async function resolveEmailChange(
  params: URLSearchParams,
  auth: () => Promise<EmailChangeAuth>,
): Promise<EmailChangeResult> {
  if (params.has("error") || params.has("error_code"))
    return emailChangeErrorResult(params.get("error_code"));

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  if (!code && !tokenHash)
    return params.has("message") ? "confirm-other" : "access-failed";

  const client = await auth();
  if (code) {
    const { error } = await client.exchangeCodeForSession(code);
    return error ? emailChangeErrorResult(error.code) : "changed";
  }
  const { data, error } = await client.verifyOtp({
    token_hash: tokenHash as string,
    type: "email_change",
  });
  if (error) return emailChangeErrorResult(error.code);
  // Con token, el primer enlace de los dos verifica sin devolver usuario: falta el otro.
  return data?.user ? "changed" : "confirm-other";
}
