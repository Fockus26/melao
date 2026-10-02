"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Field } from "@/components/auth/field";
import { FormErrorBanner } from "@/components/auth/form-banner";
import { useDeferredError } from "@/components/auth/use-deferred-error";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button, IconButton } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { emailChangeErrorCopy } from "@/lib/auth/errors";
import {
  emailChangeCallbackUrl,
  PROFILE_PATH,
  signInPathFor,
} from "@/lib/auth/redirect";
import { emailFormatError } from "@/lib/auth/validation";
import {
  checkAccount,
  initials,
  type ProfileAccount,
} from "@/lib/profile/profile";
import { createClient } from "@/lib/supabase/client";
import { siteOrigin } from "@/lib/supabase/env";
import { SAVE_COPY } from "./use-profile-save";

// Copy provisional (CONTENT_CHECKLIST fila 74).
const COPY = {
  heading: "Cuenta",
  noName: "Sin nombre",
  edit: "Editar nombre y correo",
  sheetTitle: "Nombre y correo",
  sheetText:
    "Tu nombre se ve en Inicio. Con el correo entras a Melao y te llegan los avisos.",
  name: "Nombre",
  email: "Correo",
  emailHelp:
    "Si lo cambias, te enviamos un enlace para confirmarlo. Hasta entonces entras con el actual.",
  save: "Guardar",
  saving: "Guardando…",
  pending: (email: string) =>
    `Cambio pendiente a ${email}: abre el enlace que te enviamos para confirmarlo.`,
  sentTitle: "Revisa tu correo",
  sent: (to: string) =>
    `Te enviamos un enlace a ${to}. Si también te llega uno a tu correo actual, ábrelo: el cambio se aplica cuando confirmes los dos. Ábrelos en este mismo navegador; vencen en una hora.`,
  nameSaved: "Tu nombre se guardó.",
  done: "Listo",
} as const;

export function AccountSection({
  account,
  userId,
  mode = "live",
}: {
  account: ProfileAccount;
  userId?: string;
  mode?: "live" | "sample";
}) {
  const [open, setOpen] = useState(false);
  // Abre de nuevo con lo guardado: `key` reinicia el formulario.
  const [session, setSession] = useState(0);
  return (
    <section aria-labelledby="profile-account" className="flex flex-col gap-3">
      <h2 id="profile-account" className="sr-only">
        {COPY.heading}
      </h2>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-pill bg-surface-sunken type-h4 text-text"
        >
          {initials(account.name, account.email)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Nombre largo: parte en varias líneas (40 caracteres a 320 px). */}
          <p className="type-h3 break-words">{account.name ?? COPY.noName}</p>
          {/* Correo largo: elipsis; el texto completo sigue en el DOM (lector) y en `title`. */}
          <p
            className="truncate type-small text-text-secondary"
            title={account.email ?? undefined}
          >
            {account.email}
          </p>
        </div>
        <Sheet
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) setSession((n) => n + 1);
          }}
        >
          <SheetTrigger asChild>
            <IconButton variant="outline" aria-label={COPY.edit}>
              <Pencil strokeWidth={ICON_STROKE} aria-hidden="true" />
            </IconButton>
          </SheetTrigger>
          <SheetContent title={COPY.sheetTitle}>
            <AccountForm
              key={session}
              account={account}
              userId={userId}
              mode={mode}
              onDone={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
      {account.pendingEmail ? (
        <p className="type-small text-text-secondary">
          {COPY.pending(account.pendingEmail)}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Editar nombre y correo (D133: en un Sheet, como el de estilos). Nombre → `profiles.display_name`
 * (1–80). Correo → `auth.updateUser({ email })` con el cambio seguro de Supabase: llega un enlace
 * al correo nuevo (y al actual si el proyecto lo exige) y el cambio aplica al confirmarlo; la
 * vuelta pasa por `/auth/callback?type=email_change` y termina en Perfil (D134).
 */
function AccountForm({
  account,
  userId,
  mode,
  onDone,
}: {
  account: ProfileAccount;
  userId?: string;
  mode: "live" | "sample";
  onDone: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState(account.name ?? "");
  const [email, setEmail] = useState(account.email ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [emailServerError, setEmailServerError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  // Formato del correo con retraso mientras escribe (D100); lo demás, al enviar.
  const emailFormat = useDeferredError(email, emailFormatError(email));
  const check = checkAccount({ name, email }, account);
  const nameError = submitted ? check.errors.name : null;
  const emailError =
    emailServerError ??
    (submitted ? check.errors.email : null) ??
    emailFormat.error;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setSubmitted(true);
    setBanner(null);
    setEmailServerError(null);
    if (check.errors.name) return nameRef.current?.focus();
    if (check.errors.email) {
      emailFormat.reveal();
      return emailRef.current?.focus();
    }
    if (!check.name && !check.email) return onDone();

    submitRef.current?.focus();
    if (mode === "sample" || !userId) {
      if (check.email) setSentTo(check.email);
      else onDone();
      return;
    }

    setPending(true);
    const supabase = createClient();
    if (check.name) {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: check.name })
        .eq("id", userId);
      if (error) {
        setPending(false);
        if (error.code === "PGRST301" || error.message.includes("JWT")) {
          router.replace(signInPathFor(PROFILE_PATH));
          return;
        }
        setBanner(SAVE_COPY.error);
        return;
      }
      setNameSaved(true);
    }
    if (check.email) {
      const { error } = await supabase.auth.updateUser(
        { email: check.email },
        {
          emailRedirectTo: emailChangeCallbackUrl(
            siteOrigin(window.location.origin),
          ),
        },
      );
      setPending(false);
      router.refresh();
      if (error) {
        const copy = emailChangeErrorCopy(error);
        if (copy.field === "email") {
          setEmailServerError(copy.message);
          emailRef.current?.focus();
        } else setBanner(copy.message);
        return;
      }
      setSentTo(check.email);
      return;
    }
    setPending(false);
    router.refresh();
    onDone();
  }

  if (sentTo)
    return (
      <div className="flex flex-col gap-4">
        {nameSaved ? (
          <output className="block type-small text-text-secondary">
            {COPY.nameSaved}
          </output>
        ) : null}
        <Alert variant="info">
          <AlertContent>
            <AlertTitle>{COPY.sentTitle}</AlertTitle>
            <AlertDescription>{COPY.sent(sentTo)}</AlertDescription>
          </AlertContent>
        </Alert>
        <Button size="lg" className="w-full" onClick={onDone}>
          {COPY.done}
        </Button>
      </div>
    );

  return (
    <>
      <SheetDescription>{COPY.sheetText}</SheetDescription>
      <FormErrorBanner message={banner} />
      {nameSaved ? (
        <output className="block type-small text-text-secondary">
          {COPY.nameSaved}
        </output>
      ) : null}
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset disabled={pending} className="flex flex-col gap-4">
          <legend className="sr-only">{COPY.sheetTitle}</legend>
          <Field id={`${id}-name`} label={COPY.name} error={nameError}>
            {(own) => (
              <Input
                ref={nameRef}
                id={`${id}-name`}
                name="name"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={own}
              />
            )}
          </Field>
          <Field
            id={`${id}-email`}
            label={COPY.email}
            error={emailError}
            help={COPY.emailHelp}
          >
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
                  setEmailServerError(null);
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
          loadingText={COPY.saving}
        >
          {COPY.save}
        </Button>
      </form>
    </>
  );
}
