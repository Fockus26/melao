import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/layout/public-shell";
import { CheckoutFlow } from "@/components/plans/checkout-flow";
import { PlanActivated } from "@/components/plans/plan-activated";
import { requireUser } from "@/lib/auth/session";
import { checkoutPath, PLAN_SLUG_RE, PLANS_PATH } from "@/lib/plans/features";
import { getActivePlan, getCurrentPlanSlug } from "@/lib/plans/queries";
import { firstParam } from "@/lib/search-params";

// Copy provisional de Checkout (CONTENT_CHECKLIST fila 48).
export const metadata: Metadata = {
  title: "Confirma tu plan",
  description: "Revisa tu plan de Melao y actívalo.",
  robots: { index: false, follow: false },
};

/**
 * Checkout (`/checkout?plan=<slug>`, con sesión; P-Planes). Sin `plan`, o con uno inexistente
 * o inactivo, vuelve a Planes. Si ese plan ya es el vigente, muestra el estado activo; si no,
 * el flujo que llama a `activate-subscription` (que decide, incluido el 409 de D049).
 */
export default async function CheckoutPage(props: PageProps<"/checkout">) {
  const slug = firstParam((await props.searchParams).plan) ?? "";
  const user = await requireUser(
    PLAN_SLUG_RE.test(slug) ? checkoutPath(slug) : PLANS_PATH,
  );
  const plan = await getActivePlan(slug);
  if (!plan) redirect(PLANS_PATH);
  const currentSlug = await getCurrentPlanSlug(user.id);

  return (
    <PublicShell header="account" email={user.email ?? undefined}>
      {currentSlug === plan.slug ? (
        <PlanActivated planName={plan.name} />
      ) : (
        <CheckoutFlow plan={plan} />
      )}
    </PublicShell>
  );
}
