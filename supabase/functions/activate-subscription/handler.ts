/**
 * `activate-subscription` (api.md § Edge Functions, D015, D049).
 *
 * Entrada `{ planSlug }` → `{ subscription: { plan, status, currentPeriodEnd, priceCents,
 * currency, billingInterval } }`. v1: proveedor `placeholder`, sin cobro. El precio y el
 * período salen de `plans` en SQL (`ef_activate_subscription`), nunca del cliente.
 */

import { type AuthPort, requireUserId } from "../_shared/auth.ts";
import { jsonEndpoint } from "../_shared/http.ts";
import { invalid, object } from "../_shared/validate.ts";

export interface Subscription {
  plan: string;
  status: "active" | "past_due" | "canceled" | "expired";
  currentPeriodEnd: string;
  priceCents: number;
  currency: string;
  billingInterval: "month" | "year";
}

export interface ActivateSubscriptionPort {
  /** Una sola llamada atómica (lanza `HttpError` con los errores de regla). */
  activate(userId: string, planSlug: string): Promise<Subscription>;
}

export interface Deps {
  auth: AuthPort;
  data: ActivateSubscriptionPort;
}

const SLUG_RE = /^[a-z0-9-]{1,60}$/;

export function parseInput(body: unknown): { planSlug: string } {
  const input = object(body, "cuerpo");
  if (typeof input.planSlug !== "string" || !SLUG_RE.test(input.planSlug)) {
    invalid("planSlug", "el slug de un plan");
  }
  return { planSlug: input.planSlug };
}

export function createHandler(deps: Deps) {
  return jsonEndpoint(async ({ req, body }) => {
    const userId = await requireUserId(req, deps.auth);
    const { planSlug } = parseInput(body);
    return { subscription: await deps.data.activate(userId, planSlug) };
  });
}
