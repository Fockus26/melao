"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authErrorCopy } from "@/lib/auth/errors";
import { AUTH_ROUTES, callbackUrl } from "@/lib/auth/redirect";
import { isValidEmail } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";
import { siteOrigin } from "@/lib/supabase/env";
import { Field } from "./field";
import { FormErrorBanner } from "./form-banner";

/**
 * Recuperar: pide el enlace de restablecimiento. El aviso de "enviado" es el mismo exista o no
 * la cuenta (no revela qué correos están registrados). El enlace vuelve por `/auth/callback`
 * y termina en `/reset-password`. Copy provisional (CONTENT_CHECKLIST fila 42).
 */
export function ForgotForm({ initialError }: { initialError?: string | null }) {
  const id = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);
  const [banner, setBanner] = useState<string | null>(initialError ?? null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const email = String(
      new FormData(event.currentTarget).get("email") ?? "",
    ).trim();
    const problem = !email
      ? "Escribe tu correo."
      : isValidEmail(email)
        ? null
        : "Revisa el correo: le falta la @ o el dominio.";
    setEmailError(problem);
    if (problem) {
      setBanner(null);
      emailRef.current?.focus();
      return;
    }

    submitRef.current?.focus();
    setPending(true);
    setBanner(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl(
        siteOrigin(window.location.origin),
        AUTH_ROUTES.reset,
      ),
    });
    setPending(false);
    // Solo se muestran los errores que no dependen de si la cuenta existe (red, límite).
    if (error && error.code !== "user_not_found") {
      setBanner(authErrorCopy(error).message);
      return;
    }
    setSentTo(email);
  }

  if (sentTo)
    return (
      <div className="flex flex-col gap-6">
        <Alert variant="success">
          <AlertContent>
            <AlertTitle>Te enviamos un enlace</AlertTitle>
            <AlertDescription>
              Si hay una cuenta con <strong>{sentTo}</strong>, te llegará un
              correo con un enlace para crear una contraseña nueva. Ábrelo en
              este mismo navegador; vence en una hora.
            </AlertDescription>
          </AlertContent>
        </Alert>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href={AUTH_ROUTES.signIn}>Volver a entrar</Link>
        </Button>
      </div>
    );

  return (
    <>
      <FormErrorBanner message={banner} />
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset disabled={pending} className="flex flex-col gap-4">
          <legend className="sr-only">Recuperar tu contraseña</legend>
          <Field id={`${id}-email`} label="Correo" error={emailError}>
            {(own) => (
              <Input
                ref={emailRef}
                id={`${id}-email`}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                required
                aria-invalid={emailError ? true : undefined}
                aria-describedby={own}
              />
            )}
          </Field>
        </fieldset>
        <Button
          ref={submitRef}
          type="submit"
          size="lg"
          className="w-full"
          loading={pending}
          loadingText="Enviando…"
        >
          Enviar enlace
        </Button>
      </form>
    </>
  );
}
