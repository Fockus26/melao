import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { CheckoutFlow } from "@/components/plans/checkout-flow";
import { PlanActivated } from "@/components/plans/plan-activated";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import type { InvokeResult } from "@/lib/plans/activation";
import { getActivePlans } from "@/lib/plans/queries";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Checkout · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Respuestas simuladas de `activate-subscription` (api.md): la muestra no llama a la función ni
 * activa nada; el flujo responde esto al pulsar "Activar plan".
 */
const OUTCOMES: Record<string, { label: string; result: InvokeResult }> = {
  active: {
    label: "Activa",
    result: {
      status: 200,
      body: {
        subscription: {
          plan: "basico",
          status: "active",
          currentPeriodEnd: "2026-10-29T00:00:00Z",
        },
      },
    },
  },
  conflict: {
    label: "409 · otro plan",
    result: {
      status: 409,
      body: { error: { code: "subscription_exists", message: "" } },
    },
  },
  error: {
    label: "500 · error",
    result: { status: 500, body: { error: { code: "internal", message: "" } } },
  },
  offline: { label: "Sin conexión", result: { status: 0, body: null } },
  unauthorized: {
    label: "401 · sesión",
    result: {
      status: 401,
      body: { error: { code: "unauthorized", message: "" } },
    },
  },
  "plan-unavailable": {
    label: "404 · plan",
    result: {
      status: 404,
      body: { error: { code: "plan_not_found", message: "" } },
    },
  },
};

const LINK =
  "inline-flex min-h-12 items-center rounded-sm type-small text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text";

/**
 * Muestra de Checkout con sesión simulada (sin cuenta ni escrituras): el plan es uno real de
 * `plans`, la respuesta de la función se elige con `?outcome=` y `?view=activated` pinta el
 * estado "ya activo". Copy de ejemplo (CONTENT_CHECKLIST fila 39).
 */
export default async function CheckoutSample(
  props: PageProps<"/layouts/checkout">,
) {
  const params = await props.searchParams;
  const key = firstParam(params.outcome) ?? "active";
  const outcome = OUTCOMES[key] ?? OUTCOMES.active;
  const activated = firstParam(params.view) === "activated";
  const [plan] = await getActivePlans();
  if (!plan) return <p className="p-6">No hay planes activos.</p>;

  return (
    <PublicShell header="account" email="maria.gonzalez@ejemplo.com">
      {activated ? (
        <PlanActivated planName={plan.name} />
      ) : (
        // `key`: al cambiar de respuesta, el flujo vuelve a empezar.
        <CheckoutFlow key={key} plan={plan} sample={outcome.result} />
      )}
      <section
        aria-labelledby="muestra-checkout"
        className="mx-auto mb-12 flex w-full max-w-240 flex-col gap-3 px-6"
      >
        <h2 id="muestra-checkout" className="type-h4">
          Muestra · respuesta de la función
        </h2>
        <ul className="flex flex-wrap gap-x-4">
          {Object.entries(OUTCOMES).map(([k, { label }]) => (
            <li key={k}>
              <Link
                href={`/layouts/checkout?outcome=${k}`}
                aria-current={!activated && k === key ? "page" : undefined}
                className={LINK}
              >
                {label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/layouts/checkout?view=activated"
              aria-current={activated ? "page" : undefined}
              className={LINK}
            >
              Ya activo
            </Link>
          </li>
        </ul>
        <ThemeSwitch />
      </section>
    </PublicShell>
  );
}
