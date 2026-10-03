import { normalizeText } from "@/lib/songs/songs";
import {
  CATEGORY_FROM_PARAM,
  CATEGORY_ORDER,
  CATEGORY_PARAM,
  type StepCategory,
} from "@/lib/steps/catalog";
import type { Enums } from "@/supabase/functions/_shared/database.types";

/**
 * Admin · Pasos (`/admin/steps`): tipos, filtros de la lista, borrador del editor y textos de
 * los motivos. Sin reglas de negocio: qué bloquea publicar (`admin_step_issues`), la regla de
 * video completo, borrar y los prerequisitos viven en Postgres (D003, D149–D153). Aquí solo se
 * filtra una lista corta (≤ 80 pasos), se arma el borrador y se valida lo que el formulario
 * puede decir antes de mandar (la base vuelve a comprobarlo todo).
 */

export type VideoRole = Enums<"video_role">;
export type VideoAspect = "16:9" | "4:5" | "9:16";
export const VIDEO_ASPECTS: readonly VideoAspect[] = ["16:9", "4:5", "9:16"];

/** Estilo del segmentado (todos, publicados o no, por `sort_order`). */
export type AdminStyle = {
  id: string;
  slug: string;
  name: string;
  hasRoles: boolean;
  beatsPerPhrase: number;
  published: boolean;
};

export type AdminPosition = { id: string; name: string };

/** Una fila de `admin_steps`. */
export type AdminStepRow = {
  id: string;
  slug: string;
  name: string;
  category: StepCategory;
  difficulty: number;
  published: boolean;
  sortOrder: number;
  videosComplete: boolean;
  hasVoiceClip: boolean;
  lessonCount: number;
};

export type StepVideo = {
  role: VideoRole;
  path: string;
  durationMs: number | null;
  aspect: VideoAspect;
};

/** Motivos de `admin_step_issues` (vacío = se puede publicar). */
export type StepIssue =
  | "missing_video_leader"
  | "missing_video_follower"
  | "missing_video_both";

/** Lo editable del paso, como lo tiene el formulario (números como texto mientras se escribe). */
export type StepDraft = {
  name: string;
  slug: string;
  category: StepCategory;
  difficulty: number;
  phrases: string;
  startPositionId: string;
  endPositionId: string;
  canStart: boolean;
  canEnd: boolean;
  repeatable: boolean;
  description: string;
  /** Nota por tiempo: índice 0 = tiempo 1. Vacío = sin nota. */
  beatNotes: string[];
  variationOf: string | null;
  prerequisites: string[];
  sortOrder: string;
};

/** El paso abierto en el editor: el borrador guardado más lo que no pasa por "Guardar". */
export type AdminStepDetail = {
  id: string;
  styleId: string;
  draft: StepDraft;
  published: boolean;
  voiceClipPath: string | null;
  videos: StepVideo[];
  issues: StepIssue[];
  lessonCount: number;
};

// ── Borrador ────────────────────────────────────────────────────────────────

/** Paso nuevo: base, dificultad 1, una frase, al final de la lista. */
export function emptyDraft(
  style: Pick<AdminStyle, "beatsPerPhrase">,
  sortOrder = 0,
): StepDraft {
  return {
    name: "",
    slug: "",
    category: "base",
    difficulty: 1,
    phrases: "1",
    startPositionId: "",
    endPositionId: "",
    canStart: false,
    canEnd: false,
    repeatable: false,
    description: "",
    beatNotes: Array.from({ length: style.beatsPerPhrase }, () => ""),
    variationOf: null,
    prerequisites: [],
    sortOrder: String(sortOrder),
  };
}

/** `beat_notes` de la base → una casilla por tiempo de la frase del estilo. */
export function beatNotesToDraft(
  notes: unknown,
  beatsPerPhrase: number,
): string[] {
  const out = Array.from({ length: beatsPerPhrase }, () => "");
  if (!Array.isArray(notes)) return out;
  for (const n of notes) {
    const beat = Number((n as { beat?: unknown })?.beat);
    const note = (n as { note?: unknown })?.note;
    if (Number.isInteger(beat) && beat >= 1 && beat <= beatsPerPhrase)
      out[beat - 1] = typeof note === "string" ? note : "";
  }
  return out;
}

/** Siguiente `sort_order` para un paso nuevo: 10 más que el último (deja hueco para ordenar). */
export const nextSortOrder = (rows: readonly AdminStepRow[]) =>
  rows.reduce((max, r) => Math.max(max, r.sortOrder), 0) + 10;

/** Slug sugerido del nombre: minúsculas sin acentos, guiones, máx. 60. */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9-]+$/;

export type DraftField =
  | "name"
  | "slug"
  | "phrases"
  | "startPositionId"
  | "endPositionId"
  | "description"
  | "sortOrder"
  | "variationOf";

// Copy provisional (CONTENT_CHECKLIST fila 82).
const FIELD_ERRORS = {
  nameRequired: "Escribe el nombre del paso.",
  nameLong: "Máximo 80 caracteres.",
  slugRequired: "Escribe el slug.",
  slugPattern: "Solo minúsculas sin acentos, números y guiones.",
  slugTaken: "Ya hay un paso con este slug en el estilo.",
  phrases: "Entre 1 y 16 frases.",
  position: "Elige una posición.",
  description: "Máximo 2000 caracteres.",
  sortOrder: "Un número entero entre 0 y 32767.",
  variationSelf: "Un paso no puede ser variación de sí mismo.",
} as const;

const asInt = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s) : Number.NaN);

/**
 * Lo que el formulario puede decir antes de mandar. La base lo vuelve a comprobar (checks,
 * unicidad del slug por estilo, FKs del mismo estilo).
 */
export function validateDraft(
  draft: StepDraft,
  ctx: { stepId: string | null; rows: readonly AdminStepRow[] },
): Partial<Record<DraftField, string>> {
  const errors: Partial<Record<DraftField, string>> = {};
  const name = draft.name.trim();
  if (!name) errors.name = FIELD_ERRORS.nameRequired;
  else if (name.length > 80) errors.name = FIELD_ERRORS.nameLong;
  if (!draft.slug) errors.slug = FIELD_ERRORS.slugRequired;
  else if (!SLUG_PATTERN.test(draft.slug))
    errors.slug = FIELD_ERRORS.slugPattern;
  else if (ctx.rows.some((r) => r.slug === draft.slug && r.id !== ctx.stepId))
    errors.slug = FIELD_ERRORS.slugTaken;
  const phrases = asInt(draft.phrases);
  if (!(phrases >= 1 && phrases <= 16)) errors.phrases = FIELD_ERRORS.phrases;
  if (!draft.startPositionId) errors.startPositionId = FIELD_ERRORS.position;
  if (!draft.endPositionId) errors.endPositionId = FIELD_ERRORS.position;
  if (draft.description.trim().length > 2000)
    errors.description = FIELD_ERRORS.description;
  const order = asInt(draft.sortOrder);
  if (!(order >= 0 && order <= 32767))
    errors.sortOrder = FIELD_ERRORS.sortOrder;
  if (draft.variationOf && draft.variationOf === ctx.stepId)
    errors.variationOf = FIELD_ERRORS.variationSelf;
  return errors;
}

/** `p_step` de `admin_save_step`: solo notas con texto; prerequisitos sin sí mismo. */
export function draftToPayload(draft: StepDraft, stepId: string | null) {
  return {
    step: {
      slug: draft.slug,
      name: draft.name.trim(),
      description: draft.description.trim(),
      beat_notes: draft.beatNotes
        .map((note, i) => ({ beat: i + 1, note: note.trim() }))
        .filter((n) => n.note !== ""),
      category: draft.category,
      difficulty: draft.difficulty,
      start_position_id: draft.startPositionId,
      end_position_id: draft.endPositionId,
      phrases: asInt(draft.phrases),
      can_start: draft.canStart,
      can_end: draft.canEnd,
      repeatable: draft.repeatable,
      variation_of: draft.variationOf,
      sort_order: asInt(draft.sortOrder),
    },
    prerequisites: draft.prerequisites.filter((id) => id !== stepId),
  };
}

/** ¿Hay cambios sin guardar? (comparación de valores, sin espacios de más en los textos). */
export function isDraftDirty(a: StepDraft, b: StepDraft): boolean {
  const norm = (d: StepDraft) =>
    JSON.stringify({
      ...d,
      name: d.name.trim(),
      description: d.description.trim(),
      beatNotes: d.beatNotes.map((n) => n.trim()),
      prerequisites: [...d.prerequisites].sort(),
    });
  return norm(a) !== norm(b);
}

/**
 * Casillas de video del editor (D016): un video para ambos roles si el estilo no tiene roles o
 * el paso es libre; si no, líder y seguidor. Un video que ya existe de otro rol (cambió la
 * categoría) se sigue mostrando para poder quitarlo.
 */
export function videoSlots(
  hasRoles: boolean,
  category: StepCategory,
  videos: readonly StepVideo[],
): VideoRole[] {
  const expected: VideoRole[] =
    !hasRoles || category === "libre" ? ["both"] : ["leader", "follower"];
  const order: VideoRole[] = ["leader", "follower", "both"];
  const present = new Set<VideoRole>([
    ...expected,
    ...videos.map((v) => v.role),
  ]);
  return order.filter((r) => present.has(r));
}

/** Nombre del objeto de un video: `<step_id>/<rol>-<marca>.<ext>` en `step-videos` (D150). */
export const videoObjectPrefix = (stepId: string) => stepId;
/** Clip de voz `step.<slug>`: `steps/<step_id>-<marca>.<ext>` en `voice-clips` (D150). */
export const VOICE_CLIP_PREFIX = "steps";

// ── Filtros de la lista ─────────────────────────────────────────────────────

export type AdminStepStatusFilter = "published" | "draft" | "no-video";
export const STATUS_FILTERS: readonly AdminStepStatusFilter[] = [
  "published",
  "draft",
  "no-video",
];

/** Filtros de la lista; viven en la URL (`?q=&status=draft&category=turn,exit`). */
export type AdminStepFilters = {
  q: string;
  /** Uno a la vez; `null` = todos. */
  status: AdminStepStatusFilter | null;
  categories: readonly StepCategory[];
};

export const EMPTY_ADMIN_FILTERS: AdminStepFilters = {
  q: "",
  status: null,
  categories: [],
};

export function matchesStatus(
  row: Pick<AdminStepRow, "published" | "videosComplete">,
  status: AdminStepStatusFilter,
): boolean {
  if (status === "published") return row.published;
  if (status === "draft") return !row.published;
  return !row.videosComplete;
}

/** Cada palabra de la búsqueda en el nombre o el slug, en cualquier orden. */
export function matchesAdminQuery(
  row: Pick<AdminStepRow, "name" | "slug">,
  q: string,
): boolean {
  const words = normalizeText(q).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = `${normalizeText(row.name)} ${row.slug}`;
  return words.every((w) => haystack.includes(w));
}

/** Búsqueda, estado y categorías a la vez. Conserva el orden de `admin_steps`. */
export function filterAdminSteps<T extends AdminStepRow>(
  rows: readonly T[],
  filters: AdminStepFilters,
): T[] {
  const categories = new Set<string>(filters.categories);
  return rows.filter(
    (r) =>
      (!filters.status || matchesStatus(r, filters.status)) &&
      (categories.size === 0 || categories.has(r.category)) &&
      matchesAdminQuery(r, filters.q),
  );
}

/** Contador de cada chip de Estado: sobre toda la lista del estilo (no cambia al filtrar). */
export const statusCounts = (rows: readonly AdminStepRow[]) =>
  Object.fromEntries(
    STATUS_FILTERS.map((s) => [
      s,
      rows.filter((r) => matchesStatus(r, s)).length,
    ]),
  ) as Record<AdminStepStatusFilter, number>;

/** Categorías presentes en el estilo, en el orden del enum, con su cantidad. */
export const categoryCounts = (rows: readonly AdminStepRow[]) =>
  CATEGORY_ORDER.map((category) => ({
    category,
    count: rows.filter((r) => r.category === category).length,
  })).filter((c) => c.count > 0);

// ── URL ─────────────────────────────────────────────────────────────────────

type RawParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

/** `?step=`: un uuid, `new` o nada. */
export type StepSelection =
  | { kind: "none" }
  | { kind: "new" }
  | { kind: "step"; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseSelection(params: RawParams): StepSelection {
  const step = first(params.step);
  if (step === "new") return { kind: "new" };
  if (step && UUID.test(step)) return { kind: "step", id: step.toLowerCase() };
  return { kind: "none" };
}

/** Lee los filtros de la URL; lo que no se entiende se ignora (nunca falla). */
export function parseAdminStepFilters(params: RawParams): AdminStepFilters {
  const status = first(params.status);
  const categories = new Set(
    (first(params.category) ?? "")
      .split(",")
      .map((c) => CATEGORY_FROM_PARAM[c])
      .filter(Boolean),
  );
  return {
    q: (first(params.q) ?? "").slice(0, 120),
    status: (STATUS_FILTERS as readonly string[]).includes(status ?? "")
      ? (status as AdminStepStatusFilter)
      : null,
    categories: CATEGORY_ORDER.filter((c) => categories.has(c)),
  };
}

/**
 * Query string de la pantalla: estilo (slug), paso abierto y filtros; `extra` va primero (las
 * muestras de `/layouts` conservan su `?state=`). Contrato con el Resumen:
 * `?style=<slug>&step=<uuid>` y `?style=<slug>&status=draft`.
 */
export function adminStepsSearch(
  state: {
    style?: string | null;
    step?: string | null;
    filters?: AdminStepFilters;
  },
  extra: Record<string, string> = {},
): string {
  const p = new URLSearchParams(extra);
  if (state.style) p.set("style", state.style);
  if (state.step) p.set("step", state.step);
  const f = state.filters ?? EMPTY_ADMIN_FILTERS;
  if (f.q.trim()) p.set("q", f.q);
  if (f.status) p.set("status", f.status);
  if (f.categories.length > 0)
    p.set("category", f.categories.map((c) => CATEGORY_PARAM[c]).join(","));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const ADMIN_STEPS_PATH = "/admin/steps";

// ── Lista local ─────────────────────────────────────────────────────────────

/**
 * Lista que se ve: la del servidor con lo que el editor guardó desde entonces (fila nueva o
 * cambiada) y sin lo borrado, para no esperar a la próxima lectura. Orden de `admin_steps`.
 */
export function mergeRows(
  server: readonly AdminStepRow[],
  saved: Readonly<Record<string, AdminStepRow>>,
  removed: ReadonlySet<string>,
): AdminStepRow[] {
  const byId = new Map(server.map((r) => [r.id, r]));
  for (const [id, row] of Object.entries(saved)) byId.set(id, row);
  return [...byId.values()]
    .filter((r) => !removed.has(r.id))
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name, "es") ||
        a.id.localeCompare(b.id),
    );
}

// ── Textos ──────────────────────────────────────────────────────────────────

// Copy provisional (CONTENT_CHECKLIST fila 82).
export const ISSUE_TEXT: Record<StepIssue, string> = {
  missing_video_leader: "Falta el video del rol líder.",
  missing_video_follower: "Falta el video del rol seguidor.",
  missing_video_both: "Falta el video del paso.",
};

/** Motivos que la UI entiende, en el orden de la base; los desconocidos se ignoran. */
export const toIssues = (raw: readonly string[] | null | undefined) =>
  (raw ?? []).filter((i): i is StepIssue => i in ISSUE_TEXT);

export type DbError = { code?: string; message: string };

// Copy provisional (CONTENT_CHECKLIST fila 82).
/** Error de una escritura del editor → texto para el admin (códigos de la migración). */
export function writeErrorMessage(error: DbError): string {
  switch (error.code) {
    case "MS001":
      return "Este paso necesita el video de cada rol para estar publicado.";
    case "MS002":
      return "Ese prerequisito ya requiere este paso: quedaría en círculo.";
    case "MS003":
      return "Un prerequisito tiene que ser un paso del mismo estilo.";
    case "MS004":
      return "Un paso publicado no se borra: despublícalo primero.";
    case "MS005":
      return "Este paso está en una lección: quítalo de la lección antes de borrarlo.";
    case "23505":
      return "Ya hay un paso con este slug en el estilo.";
    case "23503":
      return "Una posición o la variación ya no existe en este estilo. Recarga la página.";
    case "23514":
    case "22P02":
      return "Algún campo tiene un valor fuera de rango. Revisa el formulario.";
    case "42501":
    case "PGRST301":
      return "Tu sesión venció o ya no eres admin. Vuelve a entrar.";
    case "P0002":
      return "Este paso ya no existe. Recarga la página.";
    default:
      return "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.";
  }
}
