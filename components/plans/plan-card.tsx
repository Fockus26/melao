import { Check, Minus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { checkoutPath, planFeatures } from "@/lib/plans/features";
import {
  billingInterval,
  formatPrice,
  INTERVAL_COPY,
} from "@/lib/plans/format";
import type { Plan } from "@/lib/plans/queries";
import { cn } from "@/lib/utils";

/**
 * Card de un plan (P-Planes): nombre h2, precio + período, tabla de 5 filas de 44 con check o
 * guion (y el texto oculto "Incluido / No incluido") y CTA lg a ancho completo. El plan con
 * profesor lleva borde dorado y la pill "Con profesor"; el vigente, la pill "Tu plan" y un
 * CTA a Inicio en vez de a Checkout. Copy provisional (CONTENT_CHECKLIST fila 47).
 */
export function PlanCard({
  plan,
  current = false,
}: {
  plan: Plan;
  current?: boolean;
}) {
  const interval = INTERVAL_COPY[billingInterval(plan.billingInterval)];
  const titleId = `plan-${plan.slug}`;

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "flex flex-col gap-4 rounded-md border bg-bg p-6",
        plan.includesCoaching ? "border-gold-600" : "border-divider",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={titleId} className="type-h2">
          {plan.name}
        </h2>
        <div className="flex flex-wrap gap-2">
          {current ? (
            <Badge variant="ok">
              <Check aria-hidden="true" strokeWidth={ICON_STROKE} />
              Tu plan
            </Badge>
          ) : null}
          {plan.includesCoaching ? (
            <Badge className="border-gold-600">Con profesor</Badge>
          ) : null}
        </div>
      </div>
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="type-numeric-xl">
          {formatPrice(plan.priceCents, plan.currency)}
        </span>
        <span className="type-small text-text-secondary">{interval.per}</span>
      </p>
      <ul className="flex flex-col border-t border-divider type-small">
        {planFeatures(plan.includesCoaching).map(({ label, included }) => (
          <li
            key={label}
            className={cn(
              "flex min-h-11 items-center gap-2.5 border-b border-divider py-2",
              included ? "text-text" : "text-text-muted",
            )}
          >
            {included ? (
              <Check
                aria-hidden="true"
                strokeWidth={ICON_STROKE}
                className="size-4.5 shrink-0"
              />
            ) : (
              <Minus
                aria-hidden="true"
                strokeWidth={ICON_STROKE}
                className="size-4.5 shrink-0"
              />
            )}
            <span>{label}</span>
            <span className="sr-only">
              {included ? "Incluido" : "No incluido"}
            </span>
          </li>
        ))}
      </ul>
      {current ? (
        <Button asChild size="lg" variant="outline" className="w-full">
          <Link href="/app">Ir a Inicio</Link>
        </Button>
      ) : (
        <Button
          asChild
          size="lg"
          variant={plan.includesCoaching ? "primary" : "outline"}
          className="w-full"
        >
          <Link href={checkoutPath(plan.slug)}>Elegir {plan.name}</Link>
        </Button>
      )}
    </article>
  );
}
