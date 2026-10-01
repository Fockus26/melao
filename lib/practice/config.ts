import { errorCode, type InvokeResult } from "@/lib/lesson/lesson";
import {
  type Anchor,
  assertAnchors,
} from "@/supabase/functions/_shared/core/grid";
import { phraseWindow } from "@/supabase/functions/_shared/core/phrases";
import { mulberry32 } from "@/supabase/functions/_shared/core/random";
import type { StyleConfig } from "@/supabase/functions/_shared/core/style";

/**
 * Configurador de la práctica libre (`/app/practice`, pantallas.md): tipos, qué canción toca
 * según el modo (D117), cuántas figuras caben y la petición a `plan-session`. Sin reglas de
 * negocio (D003): qué canciones se ven, su dificultad, si son favoritas, su popularidad y si
 * están listas salen de `practice_songs`; qué pasos entran, de `plan-session`. Aquí solo se
 * elige una fila de esa lista y se arma la petición.
 */

/** Una fila de `practice_songs`. */
export type PracticeSong = {
  id: string;
  title: string;
  artist: string;
  bpm: number | null;
  durationMs: number | null;
  danceEndMs: number | null;
  beatGrid: Anchor[] | null;
  /** 1–5; `null` si el estilo no tiene bandas de BPM ni el admin la fijó. */
  difficulty: number | null;
  favorite: boolean;
  sessions30d: number;
  /** Percentil 0–1. */
  popularity: number;
  /** Tiene rejilla y final del baile: lo que `plan-session` exige. */
  ready: boolean;
};

/** Un estilo del segmentado, con su configuración del motor y sus canciones. */
export type PracticeStyle = {
  id: string;
  name: string;
  config: StyleConfig;
  songs: PracticeSong[];
};

/** Modo de canción (producto.md §3): una concreta o una elegida por criterio. */
export type SongMode =
  | "pick"
  | "difficulty"
  | "random"
  | "popular"
  | "favorites";
export const SONG_MODES: readonly SongMode[] = [
  "pick",
  "difficulty",
  "random",
  "popular",
  "favorites",
];

/**
 * Criterio de pasos. Los cuatro primeros son `stepFilters.order` de `plan-session` (D115);
 * `favorites` es el filtro `favoritesOnly` con el orden de siempre (`review`).
 */
export type StepCriterion =
  | "review"
  | "difficulty"
  | "random"
  | "popular"
  | "favorites";
export const STEP_CRITERIA: readonly StepCriterion[] = [
  "review",
  "difficulty",
  "random",
  "popular",
  "favorites",
];

export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;

export type PracticeConfig = {
  styleId: string;
  songMode: SongMode;
  /** La canción elegida a mano (modo `pick`). */
  songId: string | null;
  criterion: StepCriterion;
  maxDifficulty: number;
  includeLearning: boolean;
};

/** Los parámetros del enlace (contrato de la tanda): `?style`, `?song`, `?mode=review`. */
export type PracticeParams = {
  style?: string;
  song?: string;
  mode?: string;
};

/**
 * Configuración inicial. Estilo: el del enlace si está en el segmentado; si no, el actual.
 * Canción: con `?song`, esa (modo `pick`); sin ella, una al azar (Práctica rápida, D117).
 * Pasos: según el repaso (también con `?mode=review`, el enlace de Inicio y Curso), sin tope de
 * dificultad y con los que están en "aprendiendo".
 */
export function initialConfig(
  styles: readonly Pick<PracticeStyle, "id">[],
  currentStyleId: string | null,
  params: PracticeParams,
): PracticeConfig | null {
  const style =
    styles.find((s) => s.id === params.style) ??
    styles.find((s) => s.id === currentStyleId) ??
    styles[0];
  if (!style) return null;
  return {
    styleId: style.id,
    songMode: params.song ? "pick" : "random",
    songId: params.song ?? null,
    criterion: "review",
    maxDifficulty: MAX_DIFFICULTY,
    includeLearning: true,
  };
}

/** Elige con la semilla entre `list` (vacía → `null`). */
function seeded<T>(list: readonly T[], seed: number): T | null {
  if (list.length === 0) return null;
  return list[Math.floor(mulberry32(seed)() * list.length)] ?? null;
}

/**
 * La canción que toca según el modo (D117). Las automáticas eligen solo entre las listas para
 * practicar; la elegida a mano se respeta aunque no lo esté (la UI explica por qué no arranca).
 * - `pick`: la del enlace.
 * - `difficulty`: la de dificultad más cercana a `difficulty` (el tope del slider de pasos);
 *   empate → la más fácil; empate → por semilla. Sin dificultad asignada no entra.
 * - `random`: por semilla entre todas.
 * - `popular`: la de más sesiones en 30 días; empate → la primera por título (el orden de la lista).
 * - `favorites`: por semilla entre las favoritas.
 */
export function pickSong(
  songs: readonly PracticeSong[],
  mode: SongMode,
  opts: { songId: string | null; difficulty: number; seed: number },
): PracticeSong | null {
  if (mode === "pick") return songs.find((s) => s.id === opts.songId) ?? null;
  const ready = songs.filter((s) => s.ready);
  switch (mode) {
    case "random":
      return seeded(ready, opts.seed);
    case "favorites":
      return seeded(
        ready.filter((s) => s.favorite),
        opts.seed,
      );
    case "popular":
      return ready.reduce<PracticeSong | null>(
        (best, s) => (!best || s.sessions30d > best.sessions30d ? s : best),
        null,
      );
    case "difficulty": {
      const rated = ready.filter((s) => s.difficulty !== null);
      const distance = (s: PracticeSong) =>
        Math.abs((s.difficulty ?? 0) - opts.difficulty);
      const best = Math.min(...rated.map(distance));
      const closest = rated.filter((s) => distance(s) === best);
      const easiest = Math.min(...closest.map((s) => s.difficulty ?? 0));
      return seeded(
        closest.filter((s) => s.difficulty === easiest),
        opts.seed,
      );
    }
  }
}

/**
 * "Caben N figuras": el `N` de `phraseWindow` (motor-de-ritmo §3, D039), el mismo que usa
 * `plan-session`. `null` si la canción no tiene rejilla válida o final del baile.
 */
export function phrasesFor(
  song: Pick<PracticeSong, "beatGrid" | "danceEndMs">,
  style: StyleConfig,
): number | null {
  if (!song.beatGrid || song.danceEndMs === null) return null;
  try {
    assertAnchors(song.beatGrid);
    return phraseWindow(style, song.beatGrid, song.danceEndMs).phrases;
  } catch {
    return null;
  }
}

/** `beat_grid` de la base (`[{beat, tMs}]`); `null` si falta o alguna ancla no tiene esa forma. */
export function parseAnchors(value: unknown): Anchor[] | null {
  if (!Array.isArray(value)) return null;
  const out = value.filter(
    (a): a is Anchor =>
      typeof a === "object" &&
      a !== null &&
      Number.isInteger((a as Anchor).beat) &&
      Number.isFinite((a as Anchor).tMs),
  );
  return out.length === value.length ? out : null;
}

/** Por qué no se puede empezar con esta canción (o `null` si se puede). */
export type SongBlock =
  | "no-songs"
  | "no-favorites"
  | "no-rated"
  | "no-pick"
  | "not-ready"
  | "too-short";

export function songBlock(
  style: Pick<PracticeStyle, "songs" | "config">,
  mode: SongMode,
  song: PracticeSong | null,
): SongBlock | null {
  if (!song) {
    if (mode === "pick") return "no-pick";
    if (!style.songs.some((s) => s.ready)) return "no-songs";
    if (mode === "favorites") return "no-favorites";
    if (mode === "difficulty") return "no-rated";
    return "no-songs";
  }
  const phrases = phrasesFor(song, style.config);
  if (!song.ready || phrases === null) return "not-ready";
  if (phrases === 0) return "too-short";
  return null;
}

/** Entrada de `plan-session` en modo libre (api.md § plan-session). */
export type FreePlanRequest = {
  styleId: string;
  songId: string;
  mode: "free";
  stepFilters: {
    maxDifficulty: number;
    favoritesOnly: boolean;
    includeLearning: boolean;
    order: "review" | "random" | "popular" | "difficulty";
  };
};

export function buildPlanRequest(
  config: Pick<
    PracticeConfig,
    "styleId" | "criterion" | "maxDifficulty" | "includeLearning"
  >,
  songId: string,
): FreePlanRequest {
  const favorites = config.criterion === "favorites";
  return {
    styleId: config.styleId,
    songId,
    mode: "free",
    stepFilters: {
      maxDifficulty: config.maxDifficulty,
      favoritesOnly: favorites,
      includeLearning: config.includeLearning,
      order: config.criterion === "favorites" ? "review" : config.criterion,
    },
  };
}

/** `sessionId` de una respuesta 200 de `plan-session`; `null` si no trae. */
export function sessionIdFrom(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const id = (body as { sessionId?: unknown }).sessionId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/**
 * Qué ve el alumno cuando Empezar no arranca:
 * - `no-steps`: no hay pasos que conozca con esos filtros → catálogo de pasos.
 * - `soon`: la canción o el estilo aún no sirven (sin rejilla, corta, sin posición inicial).
 * - `subscription`: sin plan activo → Activa tu plan.
 * - `auth`: la sesión venció → Entrar.
 * - `offline` / `error`: reintentar.
 */
export type StartProblem =
  | "no-steps"
  | "soon"
  | "subscription"
  | "auth"
  | "offline"
  | "error";

const SOON_CODES = new Set([
  "song_not_found",
  "song_not_ready",
  "song_too_short",
  "style_not_ready",
  "no_plan",
]);

export function startProblem({ status, body }: InvokeResult): StartProblem {
  if (status === 0) return "offline";
  if (status === 401) return "auth";
  const code = errorCode(body);
  if (code === "no_steps") return "no-steps";
  if (code && SOON_CODES.has(code)) return "soon";
  if (code === "no_active_subscription") return "subscription";
  return "error";
}

// ── Presentación ────────────────────────────────────────────────────────────

/** "3:15" (minutos:segundos) de una duración en ms. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Destinos del configurador (D077). */
export const PRACTICE_LINKS = {
  practice: "/app/practice",
  session: (id: string) => `/app/practice/session?id=${encodeURIComponent(id)}`,
  /** Lista de Canciones; conserva `mode` si venía (contrato con Canciones). */
  songs: (styleId: string, review: boolean) =>
    `/app/practice/songs?style=${encodeURIComponent(styleId)}${review ? "&mode=review" : ""}`,
  steps: "/app/steps",
  plans: "/plans",
} as const;

/** La URL del configurador con su estado, para volver después de entrar (`next`). */
export function practiceHref(params: {
  styleId: string;
  songId?: string | null;
  review?: boolean;
}): string {
  const q = new URLSearchParams({ style: params.styleId });
  if (params.songId) q.set("song", params.songId);
  if (params.review) q.set("mode", "review");
  return `${PRACTICE_LINKS.practice}?${q.toString()}`;
}
