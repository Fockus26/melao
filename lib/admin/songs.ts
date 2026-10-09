import { normalizeText } from "@/lib/songs/songs";

/**
 * Admin · Canciones (`/admin/songs`): tipos, filtros de la lista, borrador del editor y textos de
 * los motivos. Sin reglas de negocio: qué bloquea publicar (`admin_song_issues`), qué es una
 * canción "preparada", la licencia vencida o por vencer, la dificultad automática y borrar viven
 * en Postgres (D003, D158–D162). Aquí solo se filtra una lista corta, se arma el borrador y se
 * valida lo que el formulario puede decir antes de mandar (la base vuelve a comprobarlo todo).
 */

/** Estilo de los chips y del editor (todos, publicados o no, por `sort_order`). */
export type AdminSongStyle = {
  id: string;
  slug: string;
  name: string;
  published: boolean;
};

/** `license_status` de `admin_songs`: vencida, vence en ≤ 30 días, o vigente / sin fecha. */
export type LicenseStatus = "expired" | "expiring" | "ok";

/** Una fila de `admin_songs`. */
export type AdminSongRow = {
  id: string;
  title: string;
  artist: string;
  published: boolean;
  /** Slugs de sus estilos, por `sort_order` del estilo. */
  styleSlugs: string[];
  /** Audio + duración + rejilla (≥ 2 anclas) + fin de baile. */
  ready: boolean;
  hasAudio: boolean;
  bpm: number | null;
  durationMs: number | null;
  licenseSource: string | null;
  hasLicenseDocument: boolean;
  licenseExpiresAt: string | null;
  licenseStatus: LicenseStatus;
  lessonCount: number;
  difficultyOverride: number | null;
  /** Por las bandas de BPM del primer estilo; null sin BPM o sin bandas. */
  autoDifficulty: number | null;
  difficulty: number | null;
};

/** Motivos de `admin_song_issues` (vacío = se puede publicar), en el orden de la base. */
export type SongIssue =
  | "missing_audio"
  | "missing_grid"
  | "missing_dance_end"
  | "missing_style"
  | "missing_license_source"
  | "missing_license_document"
  | "license_expired";

/** "auto" = la de las bandas del estilo; si no, el nivel fijo 1–5 (`difficulty_override`). */
export type DifficultyChoice = "auto" | "1" | "2" | "3" | "4" | "5";

/** Lo editable de la canción, como lo tiene el formulario. */
export type SongDraft = {
  title: string;
  artist: string;
  styleIds: string[];
  difficulty: DifficultyChoice;
  licenseSource: string;
  licenseNotes: string;
  /** `YYYY-MM-DD` o vacío (sin vencimiento). */
  licenseExpiresAt: string;
};

/** Ritmo de la canción (solo lectura: lo marca el analizador, ola C). */
export type SongRhythm = {
  bpm: number | null;
  anchors: number;
  danceEndMs: number | null;
};

/** La canción abierta en el editor: el borrador guardado más lo que no pasa por "Guardar". */
export type AdminSongDetail = {
  id: string;
  draft: SongDraft;
  published: boolean;
  audioPath: string | null;
  durationMs: number | null;
  licenseDocumentPath: string | null;
  rhythm: SongRhythm;
  issues: SongIssue[];
  lessonCount: number;
  autoDifficulty: number | null;
};

// ── Borrador ────────────────────────────────────────────────────────────────

/** Canción nueva: sin datos, dificultad automática, con el estilo de los filtros si hay uno. */
export function emptySongDraft(styleIds: string[] = []): SongDraft {
  return {
    title: "",
    artist: "",
    styleIds,
    difficulty: "auto",
    licenseSource: "",
    licenseNotes: "",
    licenseExpiresAt: "",
  };
}

export const difficultyChoice = (override: number | null): DifficultyChoice =>
  override !== null && override >= 1 && override <= 5
    ? (String(override) as DifficultyChoice)
    : "auto";

/** Anclas de `beat_grid` (un arreglo jsonb; cualquier otra cosa cuenta como 0). */
export const anchorCount = (grid: unknown) =>
  Array.isArray(grid) ? grid.length : 0;

export type SongDraftField =
  | "title"
  | "artist"
  | "licenseSource"
  | "licenseNotes"
  | "licenseExpiresAt";

// Copy provisional (CONTENT_CHECKLIST fila 86).
const FIELD_ERRORS = {
  titleRequired: "Escribe el título de la canción.",
  artistRequired: "Escribe el artista.",
  long120: "Máximo 120 caracteres.",
  long200: "Máximo 200 caracteres.",
  long2000: "Máximo 2000 caracteres.",
  date: "Escribe una fecha válida (día, mes y año).",
} as const;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isValidDate = (s: string) =>
  DATE.test(s) &&
  !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) &&
  new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

/**
 * Lo que el formulario puede decir antes de mandar. La base lo vuelve a comprobar (checks de
 * longitud, fecha, estilos existentes).
 */
export function validateSongDraft(
  draft: SongDraft,
): Partial<Record<SongDraftField, string>> {
  const errors: Partial<Record<SongDraftField, string>> = {};
  const title = draft.title.trim();
  if (!title) errors.title = FIELD_ERRORS.titleRequired;
  else if (title.length > 120) errors.title = FIELD_ERRORS.long120;
  const artist = draft.artist.trim();
  if (!artist) errors.artist = FIELD_ERRORS.artistRequired;
  else if (artist.length > 120) errors.artist = FIELD_ERRORS.long120;
  if (draft.licenseSource.trim().length > 200)
    errors.licenseSource = FIELD_ERRORS.long200;
  if (draft.licenseNotes.trim().length > 2000)
    errors.licenseNotes = FIELD_ERRORS.long2000;
  if (draft.licenseExpiresAt && !isValidDate(draft.licenseExpiresAt))
    errors.licenseExpiresAt = FIELD_ERRORS.date;
  return errors;
}

/** `p_song` y `p_style_ids` de `admin_save_song`. */
export function songDraftToPayload(draft: SongDraft) {
  return {
    song: {
      title: draft.title.trim(),
      artist: draft.artist.trim(),
      difficulty_override:
        draft.difficulty === "auto" ? null : Number(draft.difficulty),
      license_source: draft.licenseSource.trim(),
      license_notes: draft.licenseNotes.trim(),
      license_expires_at: draft.licenseExpiresAt,
    },
    styleIds: [...new Set(draft.styleIds)],
  };
}

/** El borrador tal como queda guardado (sin espacios de más). */
export const trimSongDraft = (d: SongDraft): SongDraft => ({
  ...d,
  title: d.title.trim(),
  artist: d.artist.trim(),
  licenseSource: d.licenseSource.trim(),
  licenseNotes: d.licenseNotes.trim(),
});

/** ¿Hay cambios sin guardar? (comparación de valores, sin espacios de más en los textos). */
export function isSongDraftDirty(a: SongDraft, b: SongDraft): boolean {
  const norm = (d: SongDraft) =>
    JSON.stringify({ ...trimSongDraft(d), styleIds: [...d.styleIds].sort() });
  return norm(a) !== norm(b);
}

/** Audio de la canción: `songs/<song_id>/audio-<marca>.<ext>` (D150). */
export const SONG_AUDIO_BASE = "audio";
/** Documento de la licencia: `song-licenses/<song_id>/licencia-<marca>.<ext>` (D150). */
export const SONG_LICENSE_BASE = "licencia";

// ── Filtros de la lista ─────────────────────────────────────────────────────

export type AdminSongStatusFilter =
  | "published"
  | "draft"
  | "not-ready"
  | "license-expired";
export const SONG_STATUS_FILTERS: readonly AdminSongStatusFilter[] = [
  "published",
  "draft",
  "not-ready",
  "license-expired",
];

/** Valor del chip "Sin estilo" en `?style=` (los slugs de estilo son otros). */
export const NO_STYLE = "none";

/** Filtros de la lista; viven en la URL (`?q=&status=draft&style=salsa-casino,none`). */
export type AdminSongFilters = {
  q: string;
  /** Uno a la vez; `null` = todas. */
  status: AdminSongStatusFilter | null;
  /** Slugs de estilo y/o `none`; varios = cualquiera de ellos. */
  styles: readonly string[];
};

export const EMPTY_SONG_FILTERS: AdminSongFilters = {
  q: "",
  status: null,
  styles: [],
};

export function matchesSongStatus(
  row: Pick<AdminSongRow, "published" | "ready" | "licenseStatus">,
  status: AdminSongStatusFilter,
): boolean {
  if (status === "published") return row.published;
  if (status === "draft") return !row.published;
  if (status === "not-ready") return !row.ready;
  return row.licenseStatus === "expired";
}

/** Cada palabra de la búsqueda en el título o el artista (sin acentos), en cualquier orden. */
export function matchesSongQuery(
  row: Pick<AdminSongRow, "title" | "artist">,
  q: string,
): boolean {
  const words = normalizeText(q).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = `${normalizeText(row.title)} ${normalizeText(row.artist)}`;
  return words.every((w) => haystack.includes(w));
}

const matchesStyles = (
  row: Pick<AdminSongRow, "styleSlugs">,
  styles: readonly string[],
) =>
  styles.length === 0 ||
  styles.some((s) =>
    s === NO_STYLE ? row.styleSlugs.length === 0 : row.styleSlugs.includes(s),
  );

/** Búsqueda, estado y estilos a la vez. Conserva el orden de `admin_songs`. */
export function filterAdminSongs<T extends AdminSongRow>(
  rows: readonly T[],
  filters: AdminSongFilters,
): T[] {
  return rows.filter(
    (r) =>
      (!filters.status || matchesSongStatus(r, filters.status)) &&
      matchesStyles(r, filters.styles) &&
      matchesSongQuery(r, filters.q),
  );
}

/** Contador de cada chip de Estado: sobre toda la lista (no cambia al filtrar). */
export const songStatusCounts = (rows: readonly AdminSongRow[]) =>
  Object.fromEntries(
    SONG_STATUS_FILTERS.map((s) => [
      s,
      rows.filter((r) => matchesSongStatus(r, s)).length,
    ]),
  ) as Record<AdminSongStatusFilter, number>;

/** Chips de estilo: cada estilo con su cantidad, y "Sin estilo" si hay alguna así. */
export function songStyleCounts(
  rows: readonly AdminSongRow[],
  styles: readonly AdminSongStyle[],
): { value: string; count: number; style: AdminSongStyle | null }[] {
  const out: { value: string; count: number; style: AdminSongStyle | null }[] =
    styles.map((style) => ({
      value: style.slug,
      count: rows.filter((r) => r.styleSlugs.includes(style.slug)).length,
      style,
    }));
  const none = rows.filter((r) => r.styleSlugs.length === 0).length;
  if (none > 0) out.push({ value: NO_STYLE, count: none, style: null });
  return out;
}

// ── URL ─────────────────────────────────────────────────────────────────────

type RawParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

/** `?song=`: un uuid, `new` o nada. */
export type SongSelection =
  | { kind: "none" }
  | { kind: "new" }
  | { kind: "song"; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]+$/;

export function parseSongSelection(params: RawParams): SongSelection {
  const song = first(params.song);
  if (song === "new") return { kind: "new" };
  if (song && UUID.test(song)) return { kind: "song", id: song.toLowerCase() };
  return { kind: "none" };
}

/** Lee los filtros de la URL; lo que no se entiende se ignora (nunca falla). */
export function parseAdminSongFilters(params: RawParams): AdminSongFilters {
  const status = first(params.status);
  const styles = [
    ...new Set(
      (first(params.style) ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => SLUG.test(s)),
    ),
  ];
  return {
    q: (first(params.q) ?? "").slice(0, 120),
    status: (SONG_STATUS_FILTERS as readonly string[]).includes(status ?? "")
      ? (status as AdminSongStatusFilter)
      : null,
    styles,
  };
}

/**
 * Query string de la pantalla: canción abierta y filtros; `extra` va primero (las muestras de
 * `/layouts` conservan su `?state=`). Contrato con el Resumen: `?song=<uuid>`.
 */
export function adminSongsSearch(
  state: { song?: string | null; filters?: AdminSongFilters },
  extra: Record<string, string> = {},
): string {
  const p = new URLSearchParams(extra);
  if (state.song) p.set("song", state.song);
  const f = state.filters ?? EMPTY_SONG_FILTERS;
  if (f.q.trim()) p.set("q", f.q);
  if (f.status) p.set("status", f.status);
  if (f.styles.length > 0) p.set("style", f.styles.join(","));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const ADMIN_SONGS_PATH = "/admin/songs";

// ── Lista local ─────────────────────────────────────────────────────────────

/**
 * Lista que se ve: la del servidor con lo que el editor guardó desde entonces (fila nueva o
 * cambiada) y sin lo borrado, para no esperar a la próxima lectura. Orden de `admin_songs`.
 */
export function mergeSongRows(
  server: readonly AdminSongRow[],
  saved: Readonly<Record<string, AdminSongRow>>,
  removed: ReadonlySet<string>,
): AdminSongRow[] {
  const byId = new Map(server.map((r) => [r.id, r]));
  for (const [id, row] of Object.entries(saved)) byId.set(id, row);
  return [...byId.values()]
    .filter((r) => !removed.has(r.id))
    .sort(
      (a, b) =>
        a.title.localeCompare(b.title, "es") ||
        a.artist.localeCompare(b.artist, "es") ||
        a.id.localeCompare(b.id),
    );
}

// ── Textos ──────────────────────────────────────────────────────────────────

// Copy provisional (CONTENT_CHECKLIST fila 86).
export const SONG_ISSUE_TEXT: Record<SongIssue, string> = {
  missing_audio: "Falta el audio (o no pudimos leer su duración).",
  missing_grid:
    "Falta marcar el ritmo: márcala en el analizador de ritmo (llega pronto).",
  missing_dance_end:
    "Falta el fin de baile: márcalo en el analizador de ritmo (llega pronto).",
  missing_style: "Elige al menos un estilo.",
  missing_license_source: "Falta la fuente de la licencia.",
  missing_license_document: "Falta el documento de la licencia.",
  license_expired: "La licencia venció: renuévala o cambia la fecha.",
};

/** Motivos que la UI entiende, en el orden de la base; los desconocidos se ignoran. */
export const toSongIssues = (raw: readonly string[] | null | undefined) =>
  (raw ?? []).filter((i): i is SongIssue => i in SONG_ISSUE_TEXT);

export type DbError = { code?: string; message: string };

// Copy provisional (CONTENT_CHECKLIST fila 86).
/** Error de una escritura del editor → texto para el admin (códigos de la migración). */
export function songWriteErrorMessage(error: DbError): string {
  switch (error.code) {
    case "MS201":
      return "A esta canción todavía le falta algo para publicarse.";
    case "MS202":
      return "Una canción publicada necesita audio, licencia, ritmo y un estilo: despublícala antes de quitarlos.";
    case "MS203":
      return "Una canción publicada no se borra: despublícala primero.";
    case "MS204":
      return "Esta canción la usa una lección: cámbiala en la lección antes de borrarla.";
    case "23503":
      return "Un estilo ya no existe. Recarga la página.";
    case "23514":
      return "Algún campo tiene un valor fuera de rango. Revisa el formulario.";
    case "22007":
    case "22008":
      return "La fecha de vencimiento no es válida.";
    case "42501":
    case "PGRST301":
      return "Tu sesión venció o ya no eres admin. Vuelve a entrar.";
    case "P0002":
      return "Esta canción ya no existe. Recarga la página.";
    default:
      return "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.";
  }
}
