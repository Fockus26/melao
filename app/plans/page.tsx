import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/public-shell";
import { PlanCard } from "@/components/plans/plan-card";
import { getSessionUser } from "@/lib/auth/session";
import { getActivePlans, getCurrentPlanSlug } from "@/lib/plans/queries";

// Copy provisional de Planes (CONTENT_CHECKLIST fila 47).
export const metadata: Metadata = {
  title: "Planes",
  description:
    "Elige tu plan de Melao: cursos de salsa casino y merengue, coach por voz y repaso.",
};

/**
 * Planes (`/plans`, público; P-Planes). Precios y lo que incluye cada plan salen de `plans`
 * (activos, por `sort_order`), nunca escritos aquí. Con sesión, el header muestra el correo y
 * la card del plan vigente se marca "Tu plan".
 */
export default async function PlansPage() {
  const user = await getSessionUser();
  const [plans, currentSlug] = await Promise.all([
    getActivePlans(),
    user ? getCurrentPlanSlug(user.id) : null,
  ]);

  return (
    <PublicShell
      header={user ? "account" : "landing"}
      email={user?.email ?? undefined}
    >
      <div className="mx-auto flex w-full max-w-240 flex-col gap-8 px-6 py-12">
        <div className="flex flex-col gap-3">
          <p className="type-eyebrow text-gold-700">Planes</p>
          <h1 className="type-display">Elige cómo aprender</h1>
          <p className="type-body text-text-secondary">
            Cambias o cancelas cuando quieras.
          </p>
        </div>
        {plans.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <PlanCard
                key={plan.slug}
                plan={plan}
                current={plan.slug === currentSlug}
              />
            ))}
          </div>
        ) : (
          <p className="type-body text-text-secondary">
            Por ahora no hay planes disponibles. Vuelve pronto.
          </p>
        )}
      </div>
    </PublicShell>
  );
}
