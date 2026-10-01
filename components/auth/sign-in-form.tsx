"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type AuthErrorCopy,
  type AuthErrorField,
  authErrorCopy,
} from "@/lib/auth/errors";
import { AUTH_ROUTES } from "@/lib/auth/redirect";
import { EMAIL_EMPTY_ERROR, emailFormatError } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";
import { AUTH_LINK, OrDivider } from "./auth-panel";
import { Field } from "./field";
import { FormErrorBanner } from "./form-banner";
import { GoogleButton } from "./google-button";
import { PasswordInput } from "./password-input";
import { useDeferredError } from "./use-deferred-error";

type FieldErrors = { email?: string; password?: string };

/**
 * Entrar (P-Auth): Google arriba, separador y correo + contraseña. Copy provisional
 * (CONTENT_CHECKLIST fila 42). La sesión queda en cookies y se navega a `next`.
 */
export function SignInForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const id = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);
  const [banner, setBanner] = useState<string | null>(initialError ?? null);
  const [email, setEmail] = useState("");
  // Errores del envío (campo vacío). El de formato del correo va aparte, con retraso (D100).
  const [errors, setErrors] = useState<FieldErrors>({});
  const emailFormat = useDeferredError(email, emailFormatError(email));
  const emailError = errors.email ?? emailFormat.error;
  // Campo que el banner señala (credenciales, correo sin confirmar): se marca sin repetir texto.
  const [marked, setMarked] = useState<AuthErrorField>(null);
  const bannerId = `${id}-banner`;

  function showError({ message, field }: AuthErrorCopy) {
    setBanner(message);
    setMarked(field);
  }

  const invalid = (field: "email" | "password") =>
    (field === "email" ? emailError : errors.password) || marked === field
      ? true
      : undefined;
  const describedBy = (field: "email" | "password", own?: string) =>
    [own, marked === field ? bannerId : undefined].filter(Boolean).join(" ") ||
    undefined;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const address = email.trim();
    const password = String(form.get("password") ?? "");

    const found: FieldErrors = {};
    if (!address) found.email = EMAIL_EMPTY_ERROR;
    const formatError = emailFormatError(address);
    if (formatError) emailFormat.reveal();
    if (!password) found.password = "Escribe tu contraseña.";
    setErrors(found);
    setMarked(null);
    if (found.email || formatError || found.password) {
      setBanner(null);
      (found.email || formatError ? emailRef : passwordRef).current?.focus();
      return;
    }

    // El foco pasa al botón antes de deshabilitar los campos, para que no caiga en <body>.
    submitRef.current?.focus();
    setPending(true);
    setBanner(null);
    const { error } = await createClient().auth.signInWithPassword({
      email: address,
      password,
    });
    if (error) {
      setPending(false);
      showError(authErrorCopy(error));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <>
      <GoogleButton next={next} disabled={pending} onError={showError} />
      <OrDivider />
      <FormErrorBanner id={bannerId} message={banner} />
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset disabled={pending} className="flex flex-col gap-4">
          <legend className="sr-only">Entrar con tu correo</legend>
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
                  if (errors.email)
                    setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                onBlur={emailFormat.reveal}
                aria-invalid={invalid("email")}
                aria-describedby={describedBy("email", own)}
              />
            )}
          </Field>
          <Field
            id={`${id}-password`}
            label="Contraseña"
            error={errors.password}
            aside={
              <Link
                href={AUTH_ROUTES.forgot}
                className={`${AUTH_LINK} type-small`}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            }
          >
            {(own) => (
              <PasswordInput
                ref={passwordRef}
                id={`${id}-password`}
                name="password"
                autoComplete="current-password"
                required
                aria-invalid={invalid("password")}
                aria-describedby={describedBy("password", own)}
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
          loadingText="Entrando…"
        >
          Entrar
        </Button>
      </form>
    </>
  );
}
