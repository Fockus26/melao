import { DIFFICULTY_LEVELS } from "@/components/indicators/difficulty";

/**
 * Canciones para practicar (`/app/practice/songs`): tipos, filtros y formato. Sin reglas de
 * negocio: qué canciones se ven, su dificultad (`difficulty_override` o la banda de BPM del
 * estilo) y si son favoritas lo decide `public.practice_songs` (D003). Aquí solo se filtra y se
 * da formato a una lista corta en el cliente, con la URL como estado.
 */

/** Una fila de `practice_songs`, ya con nombres de TS. */
export type PracticeSong = {
  id: string;
  title: string;
  artist: string;
  /** Puede faltar en una canción sin preparar (solo la ve el admin, D063). */
  bpm: number | null;
  durationMs: number | null;
  /** 1–5; `null` si no hay override ni bandas del estilo. */
  difficulty: number | null;
  favorite: boolean;
  /** Tiene rejilla y `dance_end_ms`: lo que `plan-session` exige. */
  ready: boolean;
};

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

/** Filtros de la lista; viven en la URL (`?q=&difficulty=2,3&favorites=1`). */
export type SongFilters = {
  q: string;
  difficulty: readonly DifficultyLevel[];
  favorites: boolean;
};

export const EMPTY_FILTERS: SongFilters = {
  q: "",
  difficulty: [],
  favorites: false,
};

// Copy provisional (CONTENT_CHECKLIST fila 65): nombres de los niveles, los mismos que la
// muestra del Slider de primitivas.
export const DIFFICULTY_NAMES: Record<DifficultyLevel, string> = {
  1: "Muy fácil",
  2: "Fácil",
  3: "Media",
  4: "Difícil",
  5: "Muy difícil",
};

export const DIFFICULTY_OPTIONS = Array.from(
  { length: DIFFICULTY_LEVELS },
  (_, i) => (i + 1) as DifficultyLevel,
);

const isLevel = (n: number): n is DifficultyLevel =>
  Number.isInteger(n) && n >= 1 && n <= DIFFICULTY_LEVELS;

/** Minúsculas y sin acentos ni diéresis: "Pío" y "pio" son la misma búsqueda. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cada palabra de la búsqueda tiene que aparecer en el título o el artista, en cualquier orden. */
export function matchesQuery(song: PracticeSong, q: string): boolean {
  const words = normalizeText(q).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeText(`${song.title} ${song.artist}`);
  return words.every((w) => haystack.includes(w));
}

/** Aplica búsqueda, niveles (cualquiera de los elegidos) y favoritas; conserva el orden. */
export function filterSongs(
  songs: readonly PracticeSong[],
  filters: SongFilters,
): PracticeSong[] {
  const levels = new Set<number>(filters.difficulty);
  return songs.filter(
    (song) =>
      (!filters.favorites || song.favorite) &&
      (levels.size === 0 ||
        (song.difficulty !== null && levels.has(song.difficulty))) &&
      matchesQuery(song, filters.q),
  );
}

export const hasActiveFilters = (f: SongFilters) =>
  f.q.trim() !== "" || f.difficulty.length > 0 || f.favorites;

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

/** Lee los filtros de la URL; lo que no se entiende se ignora (nunca falla). */
export function parseFilters(params: RawParams): SongFilters {
  const levels = (first(params.difficulty) ?? "")
    .split(",")
    .map(Number)
    .filter(isLevel);
  return {
    q: (first(params.q) ?? "").slice(0, 120),
    difficulty: [...new Set(levels)].sort((a, b) => a - b),
    favorites: first(params.favorites) === "1",
  };
}

/**
 * Query string de la pantalla: estilo, `mode` y `song` (se conservan, contrato del brief) más los
 * filtros activos. Sin filtros, sin parámetros de más.
 */
export function songsSearch(
  base: { style?: string | null; mode?: string | null; song?: string | null },
  filters: SongFilters,
): string {
  const p = new URLSearchParams();
  if (base.style) p.set("style", base.style);
  if (base.mode) p.set("mode", base.mode);
  if (base.song) p.set("song", base.song);
  if (filters.q.trim()) p.set("q", filters.q);
  if (filters.difficulty.length > 0)
    p.set("difficulty", filters.difficulty.join(","));
  if (filters.favorites) p.set("favorites", "1");
  const s = p.toString();
  return s ? `?${s}` : "";
}

/**
 * `?mode` del configurador (hoy solo `review`, contrato del brief): se reenvía tal cual si
 * parece un modo; lo demás se descarta.
 */
export function passthroughMode(
  value: string | string[] | undefined,
): string | null {
  const mode = first(value);
  return mode && /^[a-z][a-z-]{0,19}$/.test(mode) ? mode : null;
}

/** Destino al elegir una canción: el configurador con canción y estilo (+ `mode` si venía). */
export function practiceHref(
  songId: string,
  styleId: string,
  mode?: string | null,
): string {
  const p = new URLSearchParams({ song: songId, style: styleId });
  if (mode) p.set("mode", mode);
  return `/app/practice?${p.toString()}`;
}

/** Volver al configurador conservando lo que traía (estilo, canción, `mode`). */
export function backHref(params: {
  style?: string | null;
  song?: string | null;
  mode?: string | null;
}): string {
  const p = new URLSearchParams();
  if (params.style) p.set("style", params.style);
  if (params.song) p.set("song", params.song);
  if (params.mode) p.set("mode", params.mode);
  const s = p.toString();
  return s ? `/app/practice?${s}` : "/app/practice";
}

const bpmFormat = new Intl.NumberFormat("es-419", {
  maximumFractionDigits: 1,
});

/** "184 BPM" (un decimal solo si lo tiene: "150.4 BPM", es-419 como los precios). */
export const formatBpm = (bpm: number) => `${bpmFormat.format(bpm)} BPM`;

/** "4:05": minutos sin relleno, segundos con dos cifras, hacia abajo. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const s = total % 60;
  return `${Math.floor(total / 60)}:${String(s).padStart(2, "0")}`;
}

export const difficultyName = (level: number) =>
  isLevel(level) ? DIFFICULTY_NAMES[level] : null;

/**
 * Datos de la fila, "184 BPM · 4:05" (la dificultad va aparte, con sus barras). Lo que falta se
 * omite; sin nada, cadena vacía.
 */
export function songFacts(song: Pick<PracticeSong, "bpm" | "durationMs">) {
  return [
    song.bpm !== null ? formatBpm(song.bpm) : null,
    song.durationMs !== null ? formatDuration(song.durationMs) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

// Copy provisional (CONTENT_CHECKLIST fila 65).
export const countLabel = (n: number) =>
  n === 1 ? "1 canción" : `${n} canciones`;
