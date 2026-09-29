"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldMessage } from "@/components/ui/field-message";
import { ICON_STROKE } from "@/components/ui/icon";
import { signInPathFor } from "@/lib/auth/redirect";
import {
  ACTIVATION_COPY,
  type ActivationOutcome,
  activationOutcome,
  checkoutConditions,
  type InvokeResult,
} from "@/lib/plans/activation";
import { checkoutPath, PLANS_PATH } from "@/lib/plans/features";
import {
  billingInterval,
  formatPrice,
  formatPricePer,
} from "@/lib/plans/format";
import { invokeActivateSubscription } from "@/lib/plans/invoke";
import type { Plan } from "@/lib/plans/queries";
import { PlanActivated } from "./plan-activated";

/** Enlace dentro de una frase (términos): sin alto mínimo, subrayado dorado. */
const INLINE_LINK =
  "rounded-sm font-semibold text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text";

type Failure = Exclude<ActivationOutcome, { kind: "active" }>;

/**
 * Checkout (P-Planes): resumen del plan, aviso de pago en integración, términos obligatorios y
 * "Activar plan" → `activate-subscription` con la sesión del alumno (la regla vive en la Edge
 * Function, D015/D049). Copy provisional (CONTENT_CHECKLIST fila 48).
 *
 * `sample`: solo para la muestra de `/layouts/checkout`; en vez de llamar a la función,
 * responde eso tras un momento (así se ven los estados sin activar nada real).
 */
export function CheckoutFlow({
  plan,
  sample,
}: {
  plan: Plan;
  sample?: InvokeResult;
}) {
  const id = useId();
  const checkboxRef = useRef<HTMLButtonElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLAnchorElement>(null);
  const [accepted, setAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [activated, setActivated] = useState(false);

  const interval = billingInterval(plan.billingInterval);
  const conditions = checkoutConditions(plan.billingInterval);
  const termsId = `${id}-terms`;
  const termsErrorId = `${id}-terms-error`;

  // Tras un 409, 401 o 404 reintentar no sirve: el botón deja paso al siguiente paso, y el
  // foco lo sigue (el aviso se anuncia solo: role alert/status).
  const nextStep = failure ? nextStepFor(failure, plan.slug) : null;
  useEffect(() => {
    if (failure) (nextStep ? nextRef : submitRef).current?.focus();
  }, [failure, nextStep]);

  if (activated) return <PlanActivated planName={plan.name} focus />;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!accepted) {
      setTermsError(true);
      checkboxRef.current?.focus();
      return;
    }
    setPending(true);
    setFailure(null);
    const result = sample
      ? await new Promise<InvokeResult>((resolve) =>
          setTimeout(() => resolve(sample), 800),
        )
      : await invokeActivateSubscription(plan.slug);
    const outcome = activationOutcome(result);
    setPending(false);
    if (outcome.kind === "active") setActivated(true);
    else setFailure(outcome);
  }

  const copy = failure
    ? failure.kind === "error"
      ? ACTIVATION_COPY[failure.offline ? "offline" : "error"]
      : ACTIVATION_COPY[failure.kind]
    : null;

  return (
    <div className="mx-auto flex w-full max-w-240 flex-col gap-6 px-6 pt-6 pb-12">
      <Button asChild variant="quiet" className="self-start">
        <Link href={PLANS_PATH}>
          <ChevronLeft aria-hidden="true" strokeWidth={ICON_STROKE} />
          Planes
        </Link>
      </Button>
      <h1 className="type-h1">Confirma tu plan</h1>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section
          aria-labelledby={`${id}-summary`}
          className="flex flex-col gap-3.5 rounded-md border border-divider bg-surface p-5"
        >
          <h2
            id={`${id}-summary`}
            className="type-overline text-text-secondary uppercase"
          >
            Resumen
          </h2>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="type-h2">Plan {plan.name}</p>
            <p className="type-h4 tabular-nums">
              {formatPricePer(plan.priceCents, plan.currency, interval)}
            </p>
          </div>
          <ul className="flex flex-col gap-1.5 type-small text-text-secondary">
            {conditions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <hr className="border-divider" />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <p className="type-h4">Total hoy</p>
            <p className="type-numeric-lg">{formatPrice(0, plan.currency)}</p>
          </div>
        </section>

        <form
          noValidate
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          aria-label="Activar plan"
        >
          <Alert variant="info" role="note">
            <AlertContent>
              <AlertDescription>
                <strong className="font-semibold">
                  El pago está en integración.
                </strong>{" "}
                Hoy tu plan se activa por {formatPrice(0, plan.currency)}. Te
                avisaremos antes de cualquier cobro.
              </AlertDescription>
            </AlertContent>
          </Alert>

          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-3 py-3">
              <Checkbox
                ref={checkboxRef}
                id={termsId}
                checked={accepted}
                disabled={pending}
                aria-invalid={termsError || undefined}
                aria-describedby={termsError ? termsErrorId : undefined}
                onCheckedChange={(value) => {
                  setAccepted(value === true);
                  if (value === true) setTermsError(false);
                }}
              />
              <label htmlFor={termsId} className="type-small">
                Acepto los{" "}
                <Link href="/legal/terms" className={INLINE_LINK}>
                  términos
                </Link>{" "}
                y la{" "}
                <Link href="/legal/privacy" className={INLINE_LINK}>
                  política de privacidad
                </Link>
                .
              </label>
            </div>
            {termsError ? (
              <FieldMessage tone="error" id={termsErrorId}>
                Acepta los términos para activar tu plan.
              </FieldMessage>
            ) : null}
          </div>

          {copy ? (
            <Alert variant={failure?.kind === "error" ? "error" : "warning"}>
              <AlertContent>
                <AlertTitle>{copy.title}</AlertTitle>
                <AlertDescription>{copy.body}</AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}

          {nextStep ? (
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link ref={nextRef} href={nextStep}>
                {copy?.action}
              </Link>
            </Button>
          ) : (
            <Button
              ref={submitRef}
              type="submit"
              size="lg"
              className="w-full"
              loading={pending}
              loadingText="Activando…"
            >
              {failure ? ACTIVATION_COPY.error.action : "Activar plan"}
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

function nextStepFor(failure: Failure, planSlug: string): string | null {
  switch (failure.kind) {
    case "conflict":
      return "/app";
    case "unauthorized":
      return signInPathFor(checkoutPath(planSlug));
    case "plan-unavailable":
      return PLANS_PATH;
    case "error":
      return null;
  }
}
