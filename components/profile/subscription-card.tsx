import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  PERIOD_PREFIX,
  PROFILE_LINKS,
  type ProfileSubscription,
  SUBSCRIPTION_PILLS,
} from "@/lib/profile/profile";
import { LocalDate } from "./local-date";

// Copy provisional (CONTENT_CHECKLIST fila 74).
const COPY = {
  heading: "Suscripción",
  yourPlan: "Tu plan",
  none: "Sin plan activo",
  noneText:
    "Con un plan desbloqueas los videos, la práctica con el coach y los repasos.",
  activate: "Activa tu plan",
} as const;

/**
 * Card de la suscripción (handoff § Perfil): plan, pill con texto y la línea del período. Sin
 * suscripción vigente, "Activa tu plan" → `/plans` (D036). El CTA a Consultoría es v2 y no se
 * muestra (D135).
 */
export function SubscriptionCard({
  subscription,
}: {
  subscription: ProfileSubscription | null;
}) {
  const pill = subscription ? SUBSCRIPTION_PILLS[subscription.state] : null;
  const active = subscription?.state === "active";
  return (
    <section
      aria-labelledby="profile-subscription"
      className="flex flex-col gap-4"
    >
      <h2
        id="profile-subscription"
        className="border-b border-divider pb-2 type-h3"
      >
        {COPY.heading}
      </h2>
      <Card className="gap-4">
        {subscription && pill ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="type-small text-text-secondary">
                  {COPY.yourPlan}
                </p>
                <p className="type-h3 break-words">
                  {subscription.planName ?? COPY.yourPlan}
                </p>
              </div>
              <Badge variant={pill.variant}>{pill.label}</Badge>
            </div>
            <div className="flex flex-col gap-1 type-small text-text-secondary">
              {subscription.price ? (
                <p className="tabular-nums">{subscription.price}</p>
              ) : null}
              <p>
                {PERIOD_PREFIX[subscription.state]}{" "}
                <LocalDate iso={subscription.currentPeriodEnd} />
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="type-h3">{COPY.none}</p>
            <p className="type-small text-text-secondary">{COPY.noneText}</p>
          </div>
        )}
        {active ? null : (
          <Button asChild className="self-start">
            <Link href={PROFILE_LINKS.plans}>{COPY.activate}</Link>
          </Button>
        )}
      </Card>
    </section>
  );
}
