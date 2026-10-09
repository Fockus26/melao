import { DIFFICULTY_NAMES, type DifficultyLevel } from "@/lib/difficulty";
import type { StepCategory } from "@/lib/steps/catalog";
import {
  type CatalogIssue,
  validateCatalog,
} from "@/supabase/functions/_shared/core/combinaciones";
import { SALSA_CASINO } from "@/supabase/functions/_shared/core/style";
import { SLUG_PATTERN, slugify } from "./steps";

/**
 * Admin · Estilos (`/admin/styles`): tipos, borrador del formulario, validación previa y textos.
 * Sin reglas de negocio: los límites del motor, las bandas, publicar, borrar y las posiciones en
 * uso los vuelve a comprobar Postgres (D003, `20261003160000_admin_styles.sql`, D163–D167). La
 * validación del catálogo es la del core (`validateCatalog`), solo como aviso.
 */

export { SLUG_PATTERN, slugify };

export type StylePosition = {
  id: string;
  slug: string;
  name: string;
  /** Pasos del estilo que empiezan o terminan en ella. */
  stepCount: number;
};

/** Una fila de `admin_styles`. */
export type AdminStyleFull = {
  id: string;
  slug: string;
  name: string;
  published: boolean;
  sortOrder: number;
  hasRoles: boolean;
  beatsPerPhrase: number;
  spokenBeats: number[];
  callBeat: number;
  callSpanBeats: number;
  leadInPhrases: number;
  /** Topes de BPM por nivel (hasta 4); `null` = sin bandas. */
  bands: number[] | null;
  startPositionId: string | null;
  stepCount: number;
  stepsPublished: number;
  songCount: number;
  hasCourse: boolean;
  positions: StylePosition[];
};

/** Un paso del estilo, con lo que necesitan el catálogo y el aviso de notas por tiempo. */
export type StyleStep = {
  id: string;
  name: string;
  category: StepCategory;
  startPositionId: string;
  endPositionId: string;
  phrases: number;
  canStart: boolean;
  canEnd: boolean;
  repeatable: boolean;
  published: boolean;
  /** El mayor tiempo con nota (`beat_notes`); 0 sin notas. */
  maxNoteBeat: number;
};

/** Motivos de `admin_style_issues` (vacío = se puede publicar). */
export type StyleIssue = "missing_start_position";

// ── Límites (los mismos `check` de `dance_styles`, motor-de-ritmo §1) ─────────

export const BEATS_PER_PHRASE_OPTIONS = Array.from(
  { length: 15 },
  (_, i) => i + 2,
);
export const CALL_SPAN_OPTIONS = [1, 2, 3, 4];
export const LEAD_IN_OPTIONS = [0, 1, 2, 3, 4];
/** Topes de las bandas: niveles 1–4; el 5 queda abierto por encima del último (D163). */
export const BAND_CAPS = 4;
export const BPM_MIN = 40;
export const BPM_MAX = 300;

// ── Borrador ────────────────────────────────────────────────────────────────

/** Lo editable del estilo, como lo tiene el formulario (números como texto mientras se escribe). */
export type StyleDraft = {
  name: string;
  slug: string;
  sortOrder: string;
  hasRoles: boolean;
  beatsPerPhrase: number;
  /** Ordenados, sin repetir. */
  spokenBeats: number[];
  callBeat: number;
  callSpanBeats: number;
  leadInPhrases: number;
  /** Un tope por nivel 1–4; vacío = sin tope. */
  bands: string[];
  /** Estilo existente: una de sus posiciones ("" = ninguna). */
  startPositionId: string;
  /** Estilo nuevo: la posición inicial que se crea con él. */
  startPositionName: string;
  startPositionSlug: string;
};

export function bandsToDraft(bands: readonly number[] | null): string[] {
  return Array.from({ length: BAND_CAPS }, (_, i) =>
    bands && bands[i] !== undefined ? String(bands[i]) : "",
  );
}

/** Estilo nuevo: la configuración de salsa casino (`style.ts`), sin bandas, al final. */
export function emptyStyleDraft(sortOrder = 0): StyleDraft {
  return {
    name: "",
    slug: "",
    sortOrder: String(sortOrder),
    hasRoles: true,
    beatsPerPhrase: SALSA_CASINO.beatsPerPhrase,
    spokenBeats: [...SALSA_CASINO.spokenBeats],
    callBeat: SALSA_CASINO.callBeat,
    callSpanBeats: SALSA_CASINO.callSpanBeats,
    leadInPhrases: SALSA_CASINO.leadInPhrases,
    bands: bandsToDraft(null),
    startPositionId: "",
    startPositionName: "",
    startPositionSlug: "",
  };
}

export function styleToDraft(style: AdminStyleFull): StyleDraft {
  return {
    name: style.name,
    slug: style.slug,
    sortOrder: String(style.sortOrder),
    hasRoles: style.hasRoles,
    beatsPerPhrase: style.beatsPerPhrase,
    spokenBeats: [...style.spokenBeats].sort((a, b) => a - b),
    callBeat: style.callBeat,
    callSpanBeats: style.callSpanBeats,
    leadInPhrases: style.leadInPhrases,
    bands: bandsToDraft(style.bands),
    startPositionId: style.startPositionId ?? "",
    startPositionName: "",
    startPositionSlug: "",
  };
}

/** Siguiente `sort_order` para un estilo nuevo: 10 más que el último. */
export const nextStyleSortOrder = (styles: readonly AdminStyleFull[]) =>
  styles.reduce((max, s) => Math.max(max, s.sortOrder), 0) + 10;

/**
 * Cambiar los tiempos por frase: los tiempos hablados que ya no existen se quitan y el anuncio
 * se corre hacia atrás hasta caber (la UI lo enseña; la base lo vuelve a comprobar).
 */
export function withBeatsPerPhrase(draft: StyleDraft, bpp: number): StyleDraft {
  const span = Math.min(draft.callSpanBeats, bpp);
  const callBeat = Math.max(1, Math.min(draft.callBeat, bpp - span + 1));
  return {
    ...draft,
    beatsPerPhrase: bpp,
    spokenBeats: draft.spokenBeats.filter((b) => b <= bpp),
    callBeat,
    callSpanBeats: span,
  };
}

/** Prender o apagar un tiempo hablado. */
export function toggleSpokenBeat(beats: readonly number[], beat: number) {
  return beats.includes(beat)
    ? beats.filter((b) => b !== beat)
    : [...beats, beat].sort((a, b) => a - b);
}

/** Último tiempo que ocupa el anuncio: `callBeat + callSpanBeats − 1`. */
export const callEndBeat = (
  d: Pick<StyleDraft, "callBeat" | "callSpanBeats">,
) => d.callBeat + d.callSpanBeats - 1;

const asInt = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s) : Number.NaN);

/** Bandas del formulario → `difficulty_bpm_bands`: todas vacías = null. */
export function draftBands(bands: readonly string[]): number[] | null {
  if (bands.every((b) => b.trim() === "")) return null;
  return bands.map(asInt);
}

export type StyleDraftField =
  | "name"
  | "slug"
  | "sortOrder"
  | "spokenBeats"
  | "call"
  | "bands"
  | "startPositionName"
  | "startPositionSlug";

// Copy provisional (CONTENT_CHECKLIST fila 88).
const FIELD_ERRORS = {
  nameRequired: "Escribe el nombre del estilo.",
  nameLong: "Máximo 60 caracteres.",
  slugRequired: "Escribe el slug.",
  slugPattern: "Solo minúsculas sin acentos, números y guiones.",
  slugTaken: "Ya hay un estilo con este slug.",
  sortOrder: "Un número entero entre 0 y 32767.",
  spokenBeats: "Elige al menos un tiempo.",
  call: "El anuncio no cabe en la frase: adelanta el tiempo o acorta lo que ocupa.",
  bandsPartial: "Completa los 4 topes o deja todos vacíos.",
  bandsRange: `Cada tope, un número entero entre ${BPM_MIN} y ${BPM_MAX}.`,
  bandsOrder: "Cada tope tiene que ser mayor que el anterior.",
  positionNameRequired: "Escribe el nombre de la posición inicial.",
  positionSlugRequired: "Escribe el slug de la posición.",
} as const;

/** Bandas: vacías, o 4 topes enteros en 40–300 estrictamente ascendentes. */
export function bandsError(bands: readonly string[]): string | null {
  const values = draftBands(bands);
  if (values === null) return null;
  if (bands.some((b) => b.trim() === "")) return FIELD_ERRORS.bandsPartial;
  if (values.some((v) => !(v >= BPM_MIN && v <= BPM_MAX)))
    return FIELD_ERRORS.bandsRange;
  if (values.some((v, i) => i > 0 && v <= values[i - 1]))
    return FIELD_ERRORS.bandsOrder;
  return null;
}

/** Lo que el formulario puede decir antes de mandar (la base lo vuelve a comprobar todo). */
export function validateStyleDraft(
  draft: StyleDraft,
  ctx: { styleId: string | null; styles: readonly AdminStyleFull[] },
): Partial<Record<StyleDraftField, string>> {
  const errors: Partial<Record<StyleDraftField, string>> = {};
  const name = draft.name.trim();
  if (!name) errors.name = FIELD_ERRORS.nameRequired;
  else if (name.length > 60) errors.name = FIELD_ERRORS.nameLong;
  if (!draft.slug) errors.slug = FIELD_ERRORS.slugRequired;
  else if (!SLUG_PATTERN.test(draft.slug))
    errors.slug = FIELD_ERRORS.slugPattern;
  else if (
    ctx.styles.some((s) => s.slug === draft.slug && s.id !== ctx.styleId)
  )
    errors.slug = FIELD_ERRORS.slugTaken;
  const order = asInt(draft.sortOrder);
  if (!(order >= 0 && order <= 32767))
    errors.sortOrder = FIELD_ERRORS.sortOrder;
  if (draft.spokenBeats.length === 0)
    errors.spokenBeats = FIELD_ERRORS.spokenBeats;
  if (callEndBeat(draft) > draft.beatsPerPhrase)
    errors.call = FIELD_ERRORS.call;
  const bands = bandsError(draft.bands);
  if (bands) errors.bands = bands;
  if (ctx.styleId === null) {
    if (!draft.startPositionName.trim())
      errors.startPositionName = FIELD_ERRORS.positionNameRequired;
    if (!draft.startPositionSlug)
      errors.startPositionSlug = FIELD_ERRORS.positionSlugRequired;
    else if (!SLUG_PATTERN.test(draft.startPositionSlug))
      errors.startPositionSlug = FIELD_ERRORS.slugPattern;
  }
  return errors;
}

/** `p_style` y `p_start_position` de `admin_save_style`. */
export function styleDraftToPayload(draft: StyleDraft, styleId: string | null) {
  return {
    style: {
      slug: draft.slug,
      name: draft.name.trim(),
      sort_order: asInt(draft.sortOrder),
      has_roles: draft.hasRoles,
      beats_per_phrase: draft.beatsPerPhrase,
      spoken_beats: [...draft.spokenBeats].sort((a, b) => a - b),
      call_beat: draft.callBeat,
      call_span_beats: draft.callSpanBeats,
      lead_in_phrases: draft.leadInPhrases,
      difficulty_bpm_bands: draftBands(draft.bands),
      start_position_id:
        styleId === null ? null : draft.startPositionId || null,
    },
    startPosition:
      styleId === null
        ? {
            name: draft.startPositionName.trim(),
            slug: draft.startPositionSlug,
          }
        : null,
  };
}

/** ¿Hay cambios sin guardar? */
export function isStyleDraftDirty(a: StyleDraft, b: StyleDraft): boolean {
  const norm = (d: StyleDraft) =>
    JSON.stringify({
      ...d,
      name: d.name.trim(),
      startPositionName: d.startPositionName.trim(),
      bands: d.bands.map((x) => x.trim()),
      spokenBeats: [...d.spokenBeats].sort((x, y) => x - y),
    });
  return norm(a) !== norm(b);
}

/** El mayor tiempo con nota de `beat_notes` (0 sin notas). */
export function maxNoteBeat(notes: unknown): number {
  if (!Array.isArray(notes)) return 0;
  return notes.reduce((max: number, n) => {
    const beat = Number((n as { beat?: unknown })?.beat);
    return Number.isInteger(beat) && beat > max ? beat : max;
  }, 0);
}

/** Pasos con notas en tiempos que la frase ya no tiene (se avisan; no se tocan). */
export const stepsWithNotesBeyond = (
  steps: readonly StyleStep[],
  beatsPerPhrase: number,
) => steps.filter((s) => s.maxNoteBeat > beatsPerPhrase);

/** El nivel que da un BPM con estas bandas (misma regla que `private.song_difficulty`). */
export const bandRangeLabel = (bands: readonly string[], level: number) => {
  const caps = bands.map(asInt);
  if (level <= BAND_CAPS) {
    const prev = level > 1 ? caps[level - 2] : Number.NaN;
    const cap = caps[level - 1];
    if (!Number.isFinite(cap)) return null;
    return Number.isFinite(prev)
      ? `${prev + 1}–${cap} BPM`
      : `Hasta ${cap} BPM`;
  }
  const last = caps[BAND_CAPS - 1];
  return Number.isFinite(last) ? `Más de ${last} BPM` : null;
};

export const BAND_LEVELS = [1, 2, 3, 4, 5].map((n) => ({
  level: n,
  name: DIFFICULTY_NAMES[n as DifficultyLevel],
}));

// ── Catálogo ────────────────────────────────────────────────────────────────

/** `validateCatalog` del core sobre los pasos del estilo (todos o solo los publicados). */
export function styleCatalogIssues(
  steps: readonly StyleStep[],
  positions: readonly StylePosition[],
  startPositionId: string,
  onlyPublished: boolean,
): CatalogIssue[] {
  return validateCatalog({
    positions: positions.map((p) => p.id),
    startPosition: startPositionId,
    steps: steps
      .filter((s) => !onlyPublished || s.published)
      .map((s) => ({
        id: s.id,
        category: s.category,
        startPosition: s.startPositionId,
        endPosition: s.endPositionId,
        phrases: s.phrases,
        canStart: s.canStart,
        canEnd: s.canEnd,
        repeatable: s.repeatable,
      })),
  });
}

// Copy provisional (CONTENT_CHECKLIST fila 88).
export function catalogIssueText(
  issue: CatalogIssue,
  positionName: (id: string) => string,
): string {
  const p = positionName(issue.position);
  switch (issue.code) {
    case "no_start_step":
      return `Ningún paso que pueda abrir una combinación sale de «${p}» (la posición inicial).`;
    case "no_base_reachable":
      return `Desde «${p}» no se llega a un paso base.`;
    case "no_end_reachable":
      return `Desde «${p}» no se llega a un paso que pueda cerrar una combinación.`;
  }
}

// ── URL ─────────────────────────────────────────────────────────────────────

type RawParams = Record<string, string | string[] | undefined>;

/** `?style=`: `new`, un slug o nada (el primero por `sort_order`). */
export type StyleSelection =
  | { kind: "new" }
  | { kind: "slug"; slug: string | null };

export function parseStyleSelection(params: RawParams): StyleSelection {
  const raw = Array.isArray(params.style) ? params.style[0] : params.style;
  if (raw === "new") return { kind: "new" };
  return { kind: "slug", slug: raw && SLUG_PATTERN.test(raw) ? raw : null };
}

/** Query string de la pantalla; `extra` va primero (las muestras conservan su `?state=`). */
export function adminStylesSearch(
  style: string | null,
  extra: Record<string, string> = {},
): string {
  const p = new URLSearchParams(extra);
  if (style) p.set("style", style);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const ADMIN_STYLES_PATH = "/admin/styles";

// ── Textos de errores ───────────────────────────────────────────────────────

// Copy provisional (CONTENT_CHECKLIST fila 88).
export const STYLE_ISSUE_TEXT: Record<StyleIssue, string> = {
  missing_start_position: "Falta la posición inicial.",
};

export const toStyleIssues = (raw: readonly string[] | null | undefined) =>
  (raw ?? []).filter((i): i is StyleIssue => i in STYLE_ISSUE_TEXT);

export type DbError = { code?: string; message: string };

// Copy provisional (CONTENT_CHECKLIST fila 88).
/** Error de una escritura de la pantalla → texto para el admin (códigos de la migración). */
export function styleWriteErrorMessage(
  error: DbError,
  context: "style" | "position" = "style",
): string {
  switch (error.code) {
    case "ME001":
      return "Los tiempos hablados tienen que estar dentro de la frase, sin repetir.";
    case "ME002":
      return "El anuncio no cabe en la frase. Revisa la anticipación.";
    case "ME003":
      return "Las bandas de BPM no son válidas: 4 topes entre 40 y 300, de menor a mayor.";
    case "ME004":
      return "Un estilo publicado no se borra: despublícalo primero.";
    case "ME005":
      return "Este estilo tiene pasos, canciones o curso: solo se borra uno vacío.";
    case "ME006":
      return "Esta posición la usan pasos: cámbiales la posición antes de borrarla.";
    case "ME007":
      return "Es la posición inicial: elige otra antes de borrarla.";
    case "ME008":
      return "Para publicar el estilo falta la posición inicial.";
    case "23505":
      return context === "position"
        ? "Ya hay una posición con este slug en el estilo."
        : "Ya hay un estilo con este slug.";
    case "23503":
      return context === "position"
        ? "La posición ya no existe o la usa algo más. Recarga la página."
        : "La posición inicial ya no existe en este estilo. Recarga la página.";
    case "23514":
    case "22P02":
      return "Algún campo tiene un valor fuera de rango. Revisa el formulario.";
    case "42501":
    case "PGRST301":
      return "Tu sesión venció o ya no eres admin. Vuelve a entrar.";
    case "P0002":
      return "Este estilo ya no existe. Recarga la página.";
    default:
      return "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.";
  }
}
