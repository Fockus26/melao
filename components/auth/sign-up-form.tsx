"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldMessage } from "@/components/ui/field-message";
import { Input } from "@/components/ui/input";
import {
  type AuthErrorCopy,
  type AuthErrorField,
  authErrorCopy,
} from "@/lib/auth/errors";
import { AUTH_ROUTES, callbackUrl } from "@/lib/auth/redirect";
import {
  checkPassword,
  emailFormatError,
  isValidEmail,
  isValidName,
  NAME_MAX_LENGTH,
} from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";
import { siteOrigin } from "@/lib/supabase/env";
import { AUTH_INLINE_LINK, OrDivider } from "./auth-panel";
import { Field } from "./field";
import { FormErrorBanner } from "./form-banner";
import { GoogleButton } from "./google-button";
import { PasswordInput } from "./password-input";
import { PasswordRequirements } from "./password-requirements";
import { useDeferredError } from "./use-deferred-error";

/**
 * Registro (P-Auth): validación en vivo y CTA deshabilitado hasta cumplir. El nombre viaja en
 * los metadatos (`full_name`) y el trigger de `profiles` lo copia a `display_name`. Si el
 * proyecto pide confirmar el correo, no hay sesión todavía y se muestra "revisa tu correo"
 * (D074). Copy provisional (CONTENT_CHECKLIST fila 42).
 */
export function SignUpForm({ next }: { next: string }) {
  const router = useRouter();
  const id = useId();
  const submitRef = useRef<HTMLButtonElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [marked, setMarked] = useState<AuthErrorField>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const bannerId = `${id}-banner`;
  const reasonId = `${id}-motivo`;
  const emailOk = isValidEmail(email);
  const ready = isValidName(name) && emailOk && checkPassword(password).valid;
  // El error de formato espera a que deje de escribir (o salga del campo) y se quita al instante (D100).
  const { error: emailError, reveal: revealEmailError } = useDeferredError(
    email,
    emailFormatError(email),
  );

  function showError({ message, field }: AuthErrorCopy) {
    setBanner(message);
    setMarked(field);
    if (field === "email") emailRef.current?.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !ready) return;
    submitRef.current?.focus();
    setPending(true);
    setBanner(null);
    setMarked(null);
    const address = email.trim();
    const { data, error } = await createClient().auth.signUp({
      email: address,
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: callbackUrl(siteOrigin(window.location.origin), next),
      },
    });
    if (error) {
      // Rehabilita los campos antes de mover el foco al que tiene el error.
      flushSync(() => setPending(false));
      showError(authErrorCopy(error));
      return;
    }
    // Con la confirmación activa, Supabase no dice que el correo ya existe: devuelve un usuario
    // sin identidades. Es el mismo caso "correo en uso" del spec.
    if (data.user && data.user.identities?.length === 0) {
      flushSync(() => setPending(false));
      showError(authErrorCopy({ code: "user_already_exists" }));
      return;
    }
    if (data.session) {
      router.replace(next);
      router.refresh();
      return;
    }
    setPending(false);
    setSentTo(address);
  }

  if (sentTo)
    return (
      <div className="flex flex-col gap-6">
        <Alert variant="success">
          <AlertContent>
            <AlertTitle>Revisa tu correo</AlertTitle>
            <AlertDescription>
              Te enviamos un enlace a <strong>{sentTo}</strong> para confirmar
              tu cuenta. Ábrelo en este mismo navegador. Si no llega en unos
              minutos, mira en spam.
            </AlertDescription>
          </AlertContent>
        </Alert>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href={AUTH_ROUTES.signIn}>Volver a entrar</Link>
        </Button>
      </div>
    );

  const describe = (field: AuthErrorField, ...own: (string | undefined)[]) =>
    [...own, marked === field ? bannerId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <>
      <GoogleButton next={next} disabled={pending} onError={showError} />
      <OrDivider />
      <FormErrorBanner id={bannerId} message={banner} />
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset disabled={pending} className="flex flex-col gap-4">
          <legend className="sr-only">Crear tu cuenta con tu correo</legend>
          <Field id={`${id}-name`} label="Nombre">
            {(own) => (
              <Input
                id={`${id}-name`}
                name="name"
                autoComplete="name"
                maxLength={NAME_MAX_LENGTH}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-describedby={own}
              />
            )}
          </Field>
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
                  if (marked === "email") setMarked(null);
                }}
                onBlur={revealEmailError}
                aria-invalid={
                  emailError || marked === "email" ? true : undefined
                }
                aria-describedby={describe("email", own)}
              />
            )}
          </Field>
          <div className="flex flex-col gap-2">
            <Field id={`${id}-password`} label="Contraseña">
              {() => (
                <PasswordInput
                  id={`${id}-password`}
                  name="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (marked === "password") setMarked(null);
                  }}
                  aria-invalid={marked === "password" ? true : undefined}
                  aria-describedby={describe("password", `${id}-requisitos`)}
                />
              )}
            </Field>
            <PasswordRequirements id={`${id}-requisitos`} password={password} />
          </div>
        </fieldset>
        <div className="flex flex-col gap-2">
          <Button
            ref={submitRef}
            type="submit"
            size="lg"
            className="w-full"
            disabled={!ready && !pending}
            loading={pending}
            loadingText="Creando tu cuenta…"
            aria-describedby={ready ? undefined : reasonId}
          >
            Crear cuenta
          </Button>
          {ready ? null : (
            <FieldMessage id={reasonId}>
              Completa tu nombre, un correo válido y los requisitos de la
              contraseña.
            </FieldMessage>
          )}
        </div>
      </form>
      {/* Aceptación de términos por aviso, también para Google (D074). */}
      <p className="type-small text-text-secondary">
        Al crear tu cuenta aceptas los{" "}
        <Link href="/legal/terms" className={AUTH_INLINE_LINK}>
          Términos
        </Link>{" "}
        y la{" "}
        <Link href="/legal/privacy" className={AUTH_INLINE_LINK}>
          Política de privacidad
        </Link>
        .
      </p>
    </>
  );
}
