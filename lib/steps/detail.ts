import type { StepStatusValue } from "@/components/indicators/step-status";
import type { DanceRole } from "@/lib/course/path";
import type { InvokeResult } from "@/lib/lesson/lesson";
import type { SrsRating } from "@/supabase/functions/_shared/core/srs";
import type { Enums } from "@/supabase/functions/_shared/database.types";
import { STEP_LINKS, type StepCategory } from "./catalog";

/**
 * Detalle de un paso (`/app/steps/[slug]`): tipos, lectura de la fila de `public.step_detail`,
 * el cambio de estado contra `review-steps` y su estado optimista, y formato. Sin reglas de
 * negocio (D003): qué paso se ve, si es libre, qué cuenta como relacionado, el rol de la
 * tarjeta y el historial los decide `step_detail` (D138–D140); qué hace cada estado con la
 * tarjeta, `review-steps` (srs.md § Estados del catálogo). TS puro: lo prueban los tests y lo
 * copian Android/iOS.
 */

export type VideoRole = Enums<"video_role">;
export type ReviewContext = Enums<"review_context">;
export type Relation = "prerequisite" | "base" | "variation";

export type StepVideo = { role: VideoRole; durationMs: number | null };
export type BeatNote = { beat: number; note: string };
export type RelatedStep = {
  id: string;
  slug: string;
  name: string;
  relation: Relation;
};
export type HistoryEntry = {
  reviewedAt: string;
  rating: SrsRating;
  context: ReviewContext;
  role: DanceRole;
};

export type StepDetail = {
  id: string;
  styleId: string;
  slug: string;
  name: string;
  description: string | null;
  category: StepCategory;
  /** 1–5. */
  difficulty: number;
  /** Duración en frases (1–16). */
  phrases: number;
  beatNotes: BeatNote[];
  /** Paso libre o estilo sin roles: un solo video, sin segmentado de rol (D016). */
  free: boolean;
  startPosition: string;
  endPosition: string;
  videos: StepVideo[];
  /** Rol de la tarjeta del alumno; `null` si el perfil aún no tiene uno. */
  role: DanceRole | null;
  status: StepStatusValue;
  favorite: boolean;
  /** Próximo repaso de la tarjeta del rol; `null` sin tarjeta. */
  dueAt: string | null;
  related: RelatedStep[];
  /** Los últimos repasos, del más reciente (D140). */
  history: HistoryEntry[];
};

// ── Lectura ─────────────────────────────────────────────────────────────────

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const list = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter(isObject) : [];
const text = (v: unknown) => (typeof v === "string" ? v : null);

const VIDEO_ROLES = new Set<string>(["leader", "follower", "both"]);
const DANCE_ROLES = new Set<string>(["leader", "follower"]);
const RELATIONS = new Set<string>(["prerequisite", "base", "variation"]);
const CONTEXTS = new Set<string>(["lesson", "practice", "catalog"]);

/** La fila de `step_detail` tal como llega de PostgREST (columnas jsonb sin tipar). */
export type StepDetailRow = {
  step_id: string;
  style_id: string;
  slug: string;
  name: string;
  description: string | null;
  category: StepCategory;
  difficulty: number;
  phrases: number;
  beat_notes: unknown;
  free: boolean;
  start_position: string;
  end_position: string;
  videos: unknown;
  role: DanceRole | null;
  status: StepStatusValue;
  favorite: boolean;
  due_at: string | null;
  related: unknown;
  history: unknown;
};

/** Fila de `step_detail` → `StepDetail`. Lo que no tenga la forma esperada se descarta. */
export function parseStepDetail(row: StepDetailRow): StepDetail {
  return {
    id: row.step_id,
    styleId: row.style_id,
    slug: row.slug,
    name: row.name,
    description: row.description?.trim() ? row.description : null,
    category: row.category,
    difficulty: row.difficulty,
    phrases: row.phrases,
    beatNotes: list(row.beat_notes)
      .filter((n) => Number.isInteger(n.beat) && typeof n.note === "string")
      .map((n) => ({ beat: n.beat as number, note: n.note as string }))
      .sort((a, b) => a.beat - b.beat),
    free: row.free,
    startPosition: row.start_position,
    endPosition: row.end_position,
    videos: list(row.videos)
      .filter((v) => VIDEO_ROLES.has(String(v.role)))
      .map((v) => ({
        role: v.role as VideoRole,
        durationMs: typeof v.duration_ms === "number" ? v.duration_ms : null,
      })),
    role: row.role ?? null,
    status: row.status,
    favorite: row.favorite,
    dueAt: row.due_at ?? null,
    related: list(row.related)
      .filter(
        (r) =>
          text(r.step_id) && text(r.slug) && RELATIONS.has(String(r.relation)),
      )
      .map((r) => ({
        id: r.step_id as string,
        slug: r.slug as string,
        name: String(r.name ?? r.slug),
        relation: r.relation as Relation,
      })),
    history: list(row.history)
      .filter(
        (h) =>
          text(h.reviewed_at) &&
          [1, 2, 3, 4].includes(h.rating as number) &&
          CONTEXTS.has(String(h.context)) &&
          DANCE_ROLES.has(String(h.role)),
      )
      .map((h) => ({
        reviewedAt: h.reviewed_at as string,
        rating: h.rating as SrsRating,
        context: h.context as ReviewContext,
        role: h.role as DanceRole,
      })),
  };
}

/** Slug válido (el `check` de `steps.slug`); otro valor ni se consulta: 404. */
export const isStepSlug = (slug: string) => /^[a-z0-9-]{1,80}$/.test(slug);

// ── Video y relacionados ────────────────────────────────────────────────────

/** Rol del segmentado al abrir: el del perfil, o líder. Paso libre: ninguno (un solo video). */
export function initialVideoRole(
  step: Pick<StepDetail, "free" | "role">,
): DanceRole | null {
  return step.free ? null : (step.role ?? "leader");
}

/** Video que se ve: el del rol, o el único (`both`); `null` si aún no hay. */
export function videoFor(
  step: Pick<StepDetail, "videos">,
  role: DanceRole | null,
): StepVideo | null {
  const byRole = (r: VideoRole) => step.videos.find((v) => v.role === r);
  return (role ? byRole(role) : undefined) ?? byRole("both") ?? null;
}

/** Relacionados agrupados por relación, en el orden de `step_detail`; sin grupos vacíos. */
export function groupRelated(
  related: readonly RelatedStep[],
): { relation: Relation; steps: RelatedStep[] }[] {
  const order: Relation[] = ["prerequisite", "base", "variation"];
  return order
    .map((relation) => ({
      relation,
      steps: related.filter((r) => r.relation === relation),
    }))
    .filter((g) => g.steps.length > 0);
}

/**
 * Enlace al detalle de otro paso. Si el paso que se ve no es del estilo actual, el enlace lleva
 * `?style=` para que un slug repetido en dos estilos abra el del mismo estilo (D138).
 */
export function stepHref(
  slug: string,
  stepStyleId: string,
  currentStyleId: string | null,
): string {
  const base = STEP_LINKS.step(slug);
  return stepStyleId === currentStyleId
    ? base
    : `${base}?style=${encodeURIComponent(stepStyleId)}`;
}

/** Volver al catálogo, en el estilo del paso. */
export function catalogHref(
  stepStyleId: string,
  currentStyleId: string | null,
): string {
  return stepStyleId === currentStyleId
    ? STEP_LINKS.catalog
    : `${STEP_LINKS.catalog}?style=${encodeURIComponent(stepStyleId)}`;
}

// ── Cambiar el estado (review-steps, context "catalog") ─────────────────────

export type StatusRequest = {
  context: "catalog";
  status: { stepId: string; status: StepStatusValue }[];
};

/** Cuerpo de `review-steps`: sin `role`, la función usa el del perfil (api.md § review-steps). */
export function statusRequest(
  stepId: string,
  status: StepStatusValue,
): StatusRequest {
  return { context: "catalog", status: [{ stepId, status }] };
}

/**
 * Resultado de guardar: `ok`; `subscription` (sin plan activo, D036: "Activa tu plan");
 * `unauthorized` (sesión vencida: a Entrar); `role` (estilo con roles y perfil sin rol);
 * `offline` / `error` (se revierte y se puede reintentar).
 */
export type StatusSave =
  | "ok"
  | "subscription"
  | "unauthorized"
  | "role"
  | "offline"
  | "error";

const errorCode = (body: unknown): string | null => {
  if (!isObject(body) || !isObject(body.error)) return null;
  return typeof body.error.code === "string" ? body.error.code : null;
};

export function statusSaveResult({ status, body }: InvokeResult): StatusSave {
  if (status === 200) return "ok";
  if (status === 0) return "offline";
  if (status === 401) return "unauthorized";
  const code = errorCode(body);
  if (code === "no_active_subscription") return "subscription";
  if (code === "role_required") return "role";
  return "error";
}

/**
 * `dueAt` de la tarjeta del rol en la respuesta (`{ cards: [{ stepId, role, dueAt }] }`):
 * la del rol del alumno o, en un paso sin roles, la única. `null` sin tarjeta (`unknown`).
 */
export function dueAtFromCards(
  body: unknown,
  stepId: string,
  role: DanceRole | null,
): string | null {
  if (!isObject(body)) return null;
  const cards = list(body.cards).filter((c) => c.stepId === stepId);
  const card =
    (role ? cards.find((c) => c.role === role) : undefined) ?? cards[0];
  return card ? text(card.dueAt) : null;
}

/** Lo que el detalle le pide al backend; la muestra (`/layouts/step-detail`) pasa uno falso. */
export interface StepStatusPort {
  reviewSteps(input: StatusRequest): Promise<InvokeResult>;
}

/**
 * Estado del bloque "Tu estado", optimista (D141): al tocar un chip se ve el nuevo estado y los
 * chips quedan ocupados hasta la respuesta; si falla, vuelve al último confirmado y queda el
 * motivo. Un reductor puro para probarlo sin React.
 */
export type StatusState = {
  /** Lo que se ve marcado. */
  shown: StepStatusValue;
  /** Lo último que confirmó el servidor (o el valor inicial). */
  confirmed: StepStatusValue;
  dueAt: string | null;
  pending: boolean;
  problem: Exclude<StatusSave, "ok"> | null;
};

export type StatusAction =
  | { type: "request"; status: StepStatusValue }
  | { type: "saved"; status: StepStatusValue; dueAt: string | null }
  | { type: "failed"; problem: Exclude<StatusSave, "ok"> }
  | { type: "dismiss" };

export const initialStatusState = (
  status: StepStatusValue,
  dueAt: string | null,
): StatusState => ({
  shown: status,
  confirmed: status,
  dueAt,
  pending: false,
  problem: null,
});

export function statusReducer(
  state: StatusState,
  action: StatusAction,
): StatusState {
  switch (action.type) {
    case "request":
      if (state.pending || action.status === state.shown) return state;
      return { ...state, shown: action.status, pending: true, problem: null };
    case "saved":
      return {
        ...state,
        shown: action.status,
        confirmed: action.status,
        dueAt: action.dueAt,
        pending: false,
        problem: null,
      };
    case "failed":
      return {
        ...state,
        shown: state.confirmed,
        pending: false,
        problem: action.problem,
      };
    case "dismiss":
      return { ...state, problem: null };
  }
}

// ── Formato ─────────────────────────────────────────────────────────────────

// Copy provisional (CONTENT_CHECKLIST fila 78).
/** Categoría en singular, para el eyebrow del detalle. */
export const CATEGORY_SINGULAR: Record<StepCategory, string> = {
  base: "Paso base",
  vuelta: "Vuelta",
  entrada: "Entrada",
  salida: "Salida",
  figura: "Figura",
  variacion: "Variación",
  libre: "Paso libre",
};

// Copy provisional (CONTENT_CHECKLIST fila 78).
export const phrasesLabel = (n: number) =>
  n === 1 ? "1 frase" : `${n} frases`;

// Copy provisional (CONTENT_CHECKLIST fila 78).
export const CONTEXT_LABELS: Record<ReviewContext, string> = {
  lesson: "En una lección",
  practice: "En una práctica",
  catalog: "Marcado en Pasos",
};

/** "28 sep" (o "28 sep 2025" si no es del año de `now`), en la zona dada o la del dispositivo. */
export function shortDate(iso: string, now: Date, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const year = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric" }).format(d);
  return new Intl.DateTimeFormat("es-419", {
    timeZone,
    day: "numeric",
    month: "short",
    ...(year(date) === year(now) ? {} : { year: "numeric" }),
  })
    .format(date)
    .replace(".", "");
}
