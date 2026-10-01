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
import { EMAIL_EMPTY_ERROR, emailFormatError } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";
import { siteOrigin } from "@/lib/supabase/env";
import { Field } from "./field";
import { FormErrorBanner } from "./form-banner";
import { useDeferredError } from "./use-deferred-error";

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
  const [email, setEmail] = useState("");
  // "Escribe tu correo" sale al enviar; el de formato, con retraso mientras escribe (D100).
  const [emptyError, setEmptyError] = useState<string | null>(null);
  const emailFormat = useDeferredError(email, emailFormatError(email));
  const emailError = emptyError ?? emailFormat.error;
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const address = email.trim();
    const formatError = emailFormatError(address);
    setEmptyError(address ? null : EMAIL_EMPTY_ERROR);
    if (formatError) emailFormat.reveal();
    if (!address || formatError) {
      setBanner(null);
      emailRef.current?.focus();
      return;
    }

    submitRef.current?.focus();
    setPending(true);
    setBanner(null);
    const { error } = await createClient().auth.resetPasswordForEmail(address, {
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
    setSentTo(address);
  }

  if (sentTo)
    return (
      <div className="flex flex-col gap-6">
        {/* Aviso neutro (D102): ni el título ni el tono afirman que se envió nada, porque no
            se revela si el correo tiene cuenta. Copy provisional (CONTENT_CHECKLIST fila 58). */}
        <Alert variant="info">
          <AlertContent>
            <AlertTitle>Revisa tu correo</AlertTitle>
            <AlertDescription>
              Si <strong>{sentTo}</strong> tiene una cuenta en Melao, te llegará
              un enlace para crear una contraseña nueva; revisa también la
              carpeta de spam. Ábrelo en este mismo navegador: vence en una
              hora.
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
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmptyError(null);
                }}
                onBlur={emailFormat.reveal}
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
