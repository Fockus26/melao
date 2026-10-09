import type { Json } from "@/supabase/functions/_shared/database.types";

/**
 * Tipos y presentación del Resumen del admin (`/admin`). Sin reglas de negocio (D003): qué es
 * un aviso, qué un pendiente y qué le falta a cada cosa llegan resueltos de
 * `public.admin_summary()` (D154–D155) como códigos; aquí solo se pasa el jsonb a camelCase,
 * se arman los enlaces y se decide cuántas filas se ven antes de "n más".
 */

export type SummaryCounts = {
  stepsPublished: number;
  stepsTotal: number;
  songsPublished: number;
  songsTotal: number;
  lessonsPublished: number;
  lessonsTotal: number;
};

export type SummaryStyle = SummaryCounts & {
  id: string;
  slug: string;
  name: string;
  published: boolean;
};

export type SummaryTotals = SummaryCounts & {
  students: number;
  studentsActive: number;
};

export type SummaryItemKind = "step" | "song" | "lesson" | "style";

/** Un aviso o un pendiente: `reasons` son códigos (`missing_video`, `license_expired`, …). */
export type SummaryItem = {
  kind: SummaryItemKind;
  id: string;
  name: string;
  /** Slug del estilo (en una canción, el primero de los suyos); null si no tiene. */
  style: string | null;
  reasons: string[];
  /** Vencimiento de la licencia (`YYYY-MM-DD`), solo en avisos de canción. */
  expiresOn: string | null;
};

export type AdminSummary = {
  styles: SummaryStyle[];
  totals: SummaryTotals;
  warnings: SummaryItem[];
  pending: SummaryItem[];
};

export type SummaryState =
  | { status: "ready"; summary: AdminSummary }
  | { status: "error" };

/** Filas visibles de Avisos y de Pendientes antes de "Ver n más". */
export const SUMMARY_VISIBLE_ITEMS = 8;

/**
 * Entradas a los editores (contrato de la orquestación 2026-10-03b): el paso en la lista de su
 * estilo, la canción (`/admin/songs`), el estilo (`/admin/styles`) y la lección en el camino de
 * su estilo (`/admin/course`).
 */
export const ADMIN_SUMMARY_LINKS = {
  step: (styleSlug: string, stepId: string) =>
    `/admin/steps?style=${encodeURIComponent(styleSlug)}&step=${encodeURIComponent(stepId)}`,
  song: (songId: string) => `/admin/songs?song=${encodeURIComponent(songId)}`,
  style: (styleSlug: string) =>
    `/admin/styles?style=${encodeURIComponent(styleSlug)}`,
  lesson: (styleSlug: string, lessonId: string) =>
    `/admin/course?style=${encodeURIComponent(styleSlug)}&lesson=${encodeURIComponent(lessonId)}`,
} as const;

/**
 * Enlace de un aviso o pendiente. La canción no necesita estilo; paso, estilo y lección sí (sin
 * estilo, null).
 */
export function itemHref(item: SummaryItem): string | null {
  if (item.kind === "song") return ADMIN_SUMMARY_LINKS.song(item.id);
  if (!item.style) return null;
  if (item.kind === "step")
    return ADMIN_SUMMARY_LINKS.step(item.style, item.id);
  if (item.kind === "style") return ADMIN_SUMMARY_LINKS.style(item.style);
  return ADMIN_SUMMARY_LINKS.lesson(item.style, item.id);
}

type Raw = Record<string, unknown>;

const num = (value: unknown) => (typeof value === "number" ? value : 0);
const str = (value: unknown) => (typeof value === "string" ? value : "");
const strOrNull = (value: unknown) =>
  typeof value === "string" ? value : null;
const asList = (value: unknown): Raw[] =>
  Array.isArray(value)
    ? value.filter((v): v is Raw => typeof v === "object" && v !== null)
    : [];

function toCounts(raw: Raw): SummaryCounts {
  return {
    stepsPublished: num(raw.steps_published),
    stepsTotal: num(raw.steps_total),
    songsPublished: num(raw.songs_published),
    songsTotal: num(raw.songs_total),
    lessonsPublished: num(raw.lessons_published),
    lessonsTotal: num(raw.lessons_total),
  };
}

const KINDS: readonly SummaryItemKind[] = ["step", "song", "lesson", "style"];

function toItem(raw: Raw): SummaryItem | null {
  const kind = KINDS.find((k) => k === raw.kind);
  if (!kind) return null;
  return {
    kind,
    id: str(raw.id),
    name: str(raw.name),
    style: strOrNull(raw.style),
    reasons: Array.isArray(raw.reasons)
      ? raw.reasons.filter((r): r is string => typeof r === "string")
      : [],
    expiresOn: strOrNull(raw.expires_on),
  };
}

/** jsonb de `admin_summary()` → Resumen tipado (lo que no se reconoce, se omite). */
export function toAdminSummary(data: Json): AdminSummary {
  const raw: Raw =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? data
      : {};
  const totals: Raw =
    typeof raw.totals === "object" && raw.totals !== null
      ? (raw.totals as Raw)
      : {};
  const items = (value: unknown) =>
    asList(value)
      .map(toItem)
      .filter((i): i is SummaryItem => i !== null);
  return {
    styles: asList(raw.styles).map((s) => ({
      ...toCounts(s),
      id: str(s.id),
      slug: str(s.slug),
      name: str(s.name),
      published: s.published === true,
    })),
    totals: {
      ...toCounts(totals),
      students: num(totals.students),
      studentsActive: num(totals.students_active),
    },
    warnings: items(raw.warnings),
    pending: items(raw.pending),
  };
}
