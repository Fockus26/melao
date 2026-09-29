"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldMessage } from "@/components/ui/field-message";
import { type AuthErrorCopy, authErrorCopy } from "@/lib/auth/errors";
import { DEFAULT_AFTER_AUTH } from "@/lib/auth/redirect";
import { checkPassword } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";
import { Field } from "./field";
import { FormErrorBanner } from "./form-banner";
import { PasswordInput } from "./password-input";
import { PasswordRequirements } from "./password-requirements";

/**
 * Restablecer: nueva contraseña con la sesión de recuperación que dejó `/auth/callback`.
 * Enviando: campos deshabilitados + botón cargando (handoff P-Auth). Al guardar, a la app.
 * Copy provisional (CONTENT_CHECKLIST fila 42).
 */
export function ResetForm() {
  const router = useRouter();
  const id = useId();
  const submitRef = useRef<HTMLButtonElement>(null);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AuthErrorCopy | null>(null);

  const bannerId = `${id}-banner`;
  const reasonId = `${id}-motivo`;
  const ready = checkPassword(password).valid;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !ready) return;
    submitRef.current?.focus();
    setPending(true);
    setError(null);
    const { error: updateError } = await createClient().auth.updateUser({
      password,
    });
    if (updateError) {
      setPending(false);
      setError(authErrorCopy(updateError));
      return;
    }
    router.replace(DEFAULT_AFTER_AUTH);
    router.refresh();
  }

  const passwordMarked = error?.field === "password";

  return (
    <>
      <FormErrorBanner id={bannerId} message={error?.message ?? null} />
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset disabled={pending} className="flex flex-col gap-2">
          <legend className="sr-only">Nueva contraseña</legend>
          <Field id={`${id}-password`} label="Nueva contraseña">
            {() => (
              <PasswordInput
                id={`${id}-password`}
                name="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordMarked) setError(null);
                }}
                aria-invalid={passwordMarked ? true : undefined}
                aria-describedby={
                  passwordMarked
                    ? `${id}-requisitos ${bannerId}`
                    : `${id}-requisitos`
                }
              />
            )}
          </Field>
          <PasswordRequirements id={`${id}-requisitos`} password={password} />
        </fieldset>
        <div className="flex flex-col gap-2">
          <Button
            ref={submitRef}
            type="submit"
            size="lg"
            className="w-full"
            disabled={!ready && !pending}
            loading={pending}
            loadingText="Guardando…"
            aria-describedby={ready ? undefined : reasonId}
          >
            Guardar contraseña
          </Button>
          {ready ? null : (
            <FieldMessage id={reasonId}>
              Cumple los requisitos de la contraseña para guardarla.
            </FieldMessage>
          )}
        </div>
      </form>
    </>
  );
}
