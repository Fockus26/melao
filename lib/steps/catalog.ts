import type { StepStatusValue } from "@/components/indicators/step-status";
import { normalizeText } from "@/lib/songs/songs";
import type { Enums } from "@/supabase/functions/_shared/database.types";

/**
 * Catálogo de pasos (`/app/steps`): tipos, filtros, grupos y formato. Sin reglas de negocio:
 * qué pasos se ven, su estado, el favorito y el próximo repaso del rol los decide
 * `public.step_catalog` (D003, D127). Aquí solo se filtra y se agrupa una lista corta en el
 * cliente (D119, D128), con la URL como estado.
 */

export type StepCategory = Enums<"step_category">;

/** Una fila de `step_catalog`, ya con nombres de TS. */
export type CatalogStep = {
  id: string;
  slug: string;
  name: string;
  category: StepCategory;
  /** 1–5. */
  difficulty: number;
  status: StepStatusValue;
  favorite: boolean;
  /** Próximo repaso de la tarjeta del rol; `null` sin tarjeta (nunca repasado). */
  dueAt: string | null;
};

/** Orden de las categorías: el del enum `step_category` (el mismo de `step_catalog`). */
export const CATEGORY_ORDER: readonly StepCategory[] = [
  "base",
  "vuelta",
  "entrada",
  "salida",
  "figura",
  "variacion",
  "libre",
];

// Copy provisional (CONTENT_CHECKLIST fila 70): nombres de las categorías en plural, para la
// cabecera de cada grupo y su chip.
export const CATEGORY_NAMES: Record<StepCategory, string> = {
  base: "Pasos base",
  vuelta: "Vueltas",
  entrada: "Entradas",
  salida: "Salidas",
  figura: "Figuras",
  variacion: "Variaciones",
  libre: "Pasos libres",
};

/**
 * Valores de `?category=` en inglés (D077: los valores de la URL van en inglés; el enum de la
 * base es un identificador de código y no se toca).
 */
const CATEGORY_PARAM: Record<StepCategory, string> = {
  base: "base",
  vuelta: "turn",
  entrada: "entry",
  salida: "exit",
  figura: "figure",
  variacion: "variation",
  libre: "free",
};
const CATEGORY_FROM_PARAM = Object.fromEntries(
  Object.entries(CATEGORY_PARAM).map(([k, v]) => [v, k as StepCategory]),
) as Record<string, StepCategory>;

/** Orden de los chips de Estado: de lo que falta a lo que ya sale. */
export const STATUS_OPTIONS: readonly StepStatusValue[] = [
  "unknown",
  "learning",
  "known",
];

/** Filtros de la lista; viven en la URL (`?q=&category=turn,exit&status=learning`). */
export type StepFilters = {
  q: string;
  categories: readonly StepCategory[];
  statuses: readonly StepStatusValue[];
};

export const EMPTY_STEP_FILTERS: StepFilters = {
  q: "",
  categories: [],
  statuses: [],
};

/** Cada palabra de la búsqueda tiene que aparecer en el nombre, en cualquier orden. */
export function matchesStepQuery(step: Pick<CatalogStep, "name">, q: string) {
  const words = normalizeText(q).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeText(step.name);
  return words.every((w) => haystack.includes(w));
}

/**
 * Búsqueda, categorías (cualquiera de las elegidas) y estados (cualquiera); entre grupos de
 * filtros, todos a la vez. Conserva el orden de `step_catalog`.
 */
export function filterSteps<T extends CatalogStep>(
  steps: readonly T[],
  filters: StepFilters,
): T[] {
  const categories = new Set<string>(filters.categories);
  const statuses = new Set<string>(filters.statuses);
  return steps.filter(
    (step) =>
      (categories.size === 0 || categories.has(step.category)) &&
      (statuses.size === 0 || statuses.has(step.status)) &&
      matchesStepQuery(step, filters.q),
  );
}

export const hasActiveStepFilters = (f: StepFilters) =>
  f.q.trim() !== "" || f.categories.length > 0 || f.statuses.length > 0;

export type StepGroup<T extends CatalogStep = CatalogStep> = {
  category: StepCategory;
  steps: T[];
};

/**
 * Agrupa por categoría en el orden del enum; dentro, el orden en que llegaron (el de
 * `step_catalog`: `sort_order` del admin y nombre, D128). Sin grupos vacíos.
 */
export function groupByCategory<T extends CatalogStep>(
  steps: readonly T[],
): StepGroup<T>[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    steps: steps.filter((s) => s.category === category),
  })).filter((g) => g.steps.length > 0);
}

/** Categorías que existen en el estilo, en orden: los chips de Categoría. */
export const presentCategories = (steps: readonly CatalogStep[]) =>
  groupByCategory(steps).map((g) => g.category);

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

const list = (v: string | string[] | undefined) =>
  (first(v) ?? "").split(",").filter(Boolean);

/** Lee los filtros de la URL; lo que no se entiende se ignora (nunca falla). */
export function parseStepFilters(params: RawParams): StepFilters {
  const categories = new Set(
    list(params.category)
      .map((c) => CATEGORY_FROM_PARAM[c])
      .filter(Boolean),
  );
  const statuses = new Set(
    list(params.status).filter((s): s is StepStatusValue =>
      (STATUS_OPTIONS as readonly string[]).includes(s),
    ),
  );
  return {
    q: (first(params.q) ?? "").slice(0, 120),
    categories: CATEGORY_ORDER.filter((c) => categories.has(c)),
    statuses: STATUS_OPTIONS.filter((s) => statuses.has(s)),
  };
}

/** Query string de la pantalla: estilo y filtros activos. Sin filtros, sin parámetros de más. */
export function stepsSearch(
  base: { style?: string | null },
  filters: StepFilters,
): string {
  const p = new URLSearchParams();
  if (base.style) p.set("style", base.style);
  if (filters.q.trim()) p.set("q", filters.q);
  if (filters.categories.length > 0)
    p.set(
      "category",
      filters.categories.map((c) => CATEGORY_PARAM[c]).join(","),
    );
  if (filters.statuses.length > 0) p.set("status", filters.statuses.join(","));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Destinos del catálogo (D077: rutas en inglés). El detalle llega en la ola 2. */
export const STEP_LINKS = {
  catalog: "/app/steps",
  step: (slug: string) => `/app/steps/${slug}`,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Día de calendario en la zona dada (la del dispositivo si no se pasa). */
function calendarDay(date: Date, timeZone?: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return Math.floor(Date.parse(`${parts}T00:00:00Z`) / DAY_MS);
}

/**
 * Días de calendario hasta el próximo repaso (0 = hoy o vencido); `null` sin tarjeta o sin
 * fecha válida. Por días del dispositivo, como el resumen de la lección y el resultado.
 */
export function dueInDays(
  dueAt: string | null,
  now: Date,
  timeZone?: string,
): number | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;
  return Math.max(0, calendarDay(due, timeZone) - calendarDay(now, timeZone));
}

// Copy provisional (CONTENT_CHECKLIST fila 70).
/** "Toca hoy" · "Repaso mañana" · "Repaso en 9 días"; `null` sin tarjeta. */
export function dueLabel(
  dueAt: string | null,
  now: Date,
  timeZone?: string,
): string | null {
  const days = dueInDays(dueAt, now, timeZone);
  if (days === null) return null;
  if (days === 0) return "Toca hoy";
  if (days === 1) return "Repaso mañana";
  return `Repaso en ${days} días`;
}

// Copy provisional (CONTENT_CHECKLIST fila 70).
export const stepCountLabel = (n: number) =>
  n === 1 ? "1 paso" : `${n} pasos`;
