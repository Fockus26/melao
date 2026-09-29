/**
 * Respuesta de `activate-subscription` → estado de la pantalla de Checkout (api.md, D049).
 * Puro: sin React ni Next, para probarlo con `bun test` y portarlo a Android/iOS. La regla
 * (precio, período, un solo plan vigente) vive en la Edge Function; aquí solo se traduce.
 */

import { billingInterval, INTERVAL_COPY } from "./format";

/** Lo que devolvió la llamada: `status` HTTP (0 = no llegó: sin conexión) y el cuerpo JSON. */
export type InvokeResult = { status: number; body: unknown };

export type ActiveSubscription = {
  plan: string;
  currentPeriodEnd: string;
};

export type ActivationOutcome =
  | { kind: "active"; subscription: ActiveSubscription }
  /** 409 `subscription_exists`: ya tiene otro plan vigente (D049). */
  | { kind: "conflict" }
  /** 401: la sesión venció entre cargar la página y activar. */
  | { kind: "unauthorized" }
  /** 404 `plan_not_found`: el plan dejó de estar activo. */
  | { kind: "plan-unavailable" }
  /** Todo lo demás (500, respuesta rara, sin conexión): se reintenta. */
  | { kind: "error"; offline: boolean };

function errorCode(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function subscriptionOf(body: unknown): ActiveSubscription | null {
  if (typeof body !== "object" || body === null) return null;
  const sub = (body as { subscription?: unknown }).subscription;
  if (typeof sub !== "object" || sub === null) return null;
  const { plan, status, currentPeriodEnd } = sub as Record<string, unknown>;
  if (
    typeof plan !== "string" ||
    status !== "active" ||
    typeof currentPeriodEnd !== "string"
  )
    return null;
  return { plan, currentPeriodEnd };
}

export function activationOutcome({
  status,
  body,
}: InvokeResult): ActivationOutcome {
  if (status === 0) return { kind: "error", offline: true };
  if (status >= 200 && status < 300) {
    const subscription = subscriptionOf(body);
    return subscription
      ? { kind: "active", subscription }
      : { kind: "error", offline: false };
  }
  const code = errorCode(body);
  if (status === 409 && code === "subscription_exists")
    return { kind: "conflict" };
  if (status === 401) return { kind: "unauthorized" };
  if (status === 404 && code === "plan_not_found")
    return { kind: "plan-unavailable" };
  return { kind: "error", offline: false };
}

/**
 * Copy de los estados que no son éxito (CONTENT_CHECKLIST fila 48). Los mensajes del
 * servidor no se muestran tal cual: la UI decide el tono y el siguiente paso.
 */
export const ACTIVATION_COPY = {
  conflict: {
    title: "Ya tienes otro plan activo.",
    body: "Por ahora no se puede cambiar de plan desde aquí. Sigue con el tuyo mientras llega el cambio de plan.",
    action: "Ir a Inicio",
  },
  unauthorized: {
    title: "Tu sesión se cerró.",
    body: "Entra de nuevo para activar tu plan.",
    action: "Entrar",
  },
  "plan-unavailable": {
    title: "Ese plan ya no está disponible.",
    body: "Elige otro de los planes vigentes.",
    action: "Ver planes",
  },
  error: {
    title: "No pudimos activar tu plan.",
    body: "Inténtalo de nuevo en un momento. No se hizo ningún cobro.",
    action: "Intentar de nuevo",
  },
  offline: {
    title: "No hay conexión.",
    body: "Revisa tu internet e inténtalo de nuevo. No se hizo ningún cobro.",
    action: "Intentar de nuevo",
  },
} as const;

/** "Renovación mensual" / "Renovación anual" y la segunda condición del resumen (fila 48). */
export function checkoutConditions(interval: string): [string, string] {
  return [
    INTERVAL_COPY[billingInterval(interval)].renewal,
    "Cancelas cuando quieras desde tu perfil",
  ];
}
