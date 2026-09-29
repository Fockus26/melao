import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { PLAN_SLUG_RE } from "./features";

/**
 * Lecturas de Planes y Checkout (Server Components). Van con la sesión del visitante: RLS deja
 * leer los planes activos a todos y la suscripción solo a su dueño. El filtro `is_active` se
 * repite porque un admin ve también los inactivos, y esas pantallas son las del alumno.
 */

export type Plan = {
  slug: string;
  name: string;
  priceCents: number;
  currency: string;
  billingInterval: string;
  includesCoaching: boolean;
};

const PLAN_COLUMNS =
  "slug, name, price_cents, currency, billing_interval, includes_coaching";

type PlanRow = {
  slug: string;
  name: string;
  price_cents: number;
  currency: string;
  billing_interval: string;
  includes_coaching: boolean;
};

const toPlan = (row: PlanRow): Plan => ({
  slug: row.slug,
  name: row.name,
  priceCents: row.price_cents,
  currency: row.currency,
  billingInterval: row.billing_interval,
  includesCoaching: row.includes_coaching,
});

/** Planes activos en orden de catálogo. Un error de lectura se lanza (pantalla de error). */
export const getActivePlans = cache(async (): Promise<Plan[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select(PLAN_COLUMNS)
    .eq("is_active", true)
    .order("sort_order")
    .order("slug");
  if (error) throw new Error(`plans: ${error.message}`);
  return data.map(toPlan);
});

/** El plan activo con ese slug, o `null` (slug mal formado, inexistente o inactivo). */
export async function getActivePlan(slug: string): Promise<Plan | null> {
  if (!PLAN_SLUG_RE.test(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select(PLAN_COLUMNS)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`plans: ${error.message}`);
  return data ? toPlan(data) : null;
}

/**
 * Slug del plan de la suscripción vigente del usuario (`active` con el período en curso, la
 * misma condición que `has_active_subscription()`), o `null`. Solo sirve para marcar "Tu
 * plan": quién puede activar qué lo decide `activate-subscription`.
 */
export const getCurrentPlanSlug = cache(
  async (userId: string): Promise<string | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .select("plans!inner(slug)")
      .eq("user_id", userId)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`subscriptions: ${error.message}`);
    return data?.plans.slug ?? null;
  },
);
