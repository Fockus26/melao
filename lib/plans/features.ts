/**
 * Tabla incluido / no incluido de las cards de Planes (P-Planes). Copy provisional
 * (CONTENT_CHECKLIST fila 47). Qué incluye cada plan sale de `plans.includes_coaching`: las
 * filas `coaching` solo van incluidas en los planes con profesor. Puro, para portarlo.
 */

export type PlanFeature = { label: string; coaching: boolean };

export const PLAN_FEATURES: readonly PlanFeature[] = [
  { label: "Cursos de salsa casino y merengue", coaching: false },
  { label: "Coach por voz y práctica libre", coaching: false },
  { label: "Repaso según lo que te cuesta", coaching: false },
  { label: "Chat con el profesor", coaching: true },
  { label: "Corrección de tus videos", coaching: true },
];

export function planFeatures(includesCoaching: boolean) {
  return PLAN_FEATURES.map((f) => ({
    label: f.label,
    included: !f.coaching || includesCoaching,
  }));
}

/** Forma válida de un slug de plan (la misma que valida `activate-subscription`). */
export const PLAN_SLUG_RE = /^[a-z0-9-]{1,60}$/;

export const PLANS_PATH = "/plans";

/** `/checkout?plan=<slug>`: con invitado, el proxy lo manda a `/login?next=…`. */
export function checkoutPath(slug: string): string {
  return `/checkout?plan=${encodeURIComponent(slug)}`;
}
