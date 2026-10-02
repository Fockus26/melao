import type { DanceRole } from "@/lib/course/path";
import type { Anchor } from "@/supabase/functions/_shared/core/grid";
import type { SrsRating } from "@/supabase/functions/_shared/core/srs";
import type { StyleConfig } from "@/supabase/functions/_shared/core/style";
import type { Enums } from "@/supabase/functions/_shared/database.types";

/**
 * La lección (`/app/lessons/[id]`, pantallas.md): tipos, orden de las 6 etapas, estimación de
 * minutos (D097) y lo que se manda a / se lee de las Edge Functions. Sin reglas de negocio
 * (D003): qué lección está bloqueada y cuál sigue sale de `course_path`; el plan, de
 * `plan-session`; las tarjetas y el progreso, de `review-steps`. Aquí solo se ordena y se cuenta.
 */

export type VideoRole = Enums<"video_role">;

export type BeatNote = { beat: number; note: string };

export type LessonStep = {
  id: string;
  slug: string;
  name: string;
  /** Paso libre o estilo sin roles: un solo video, sin segmentado de rol (D016). */
  free: boolean;
  beatNotes: BeatNote[];
  /** Duración del video por rol (`both` en un paso libre); `null` si no se conoce. */
  videos: Partial<Record<VideoRole, number | null>>;
  /** `due_at` de la tarjeta del rol del alumno; `null` = paso nuevo (sin tarjeta). */
  dueAt: string | null;
};

export type LessonSong = {
  id: string;
  bpm: number | null;
  beatGrid: Anchor[] | null;
  danceEndMs: number | null;
  durationMs: number | null;
};

export type LessonData = {
  id: string;
  title: string;
  intro: string | null;
  /** 1…N en el curso (`course_path`); `null` si el curso no está publicado (vista de admin). */
  number: number | null;
  styleId: string;
  styleName: string;
  hasRoles: boolean;
  style: StyleConfig;
  /** Rol del perfil (D023); `null` si aún no eligió. */
  role: DanceRole | null;
  practiceSongId: string | null;
  practicePhrases: number | null;
  finalSongId: string | null;
  /** Canciones de la lección que el alumno puede leer (RLS: el alumno, solo las publicadas). */
  songs: LessonSong[];
  steps: LessonStep[];
  /** Nombre y slug de los pasos del estilo: el plan también usa los ya enseñados y la base. */
  stepNames: Record<string, { slug: string; name: string }>;
  /** Calibración web del alumno (ms); `null` → la latencia del navegador (D124, D145). */
  latencyOffsetMs: number | null;
  /** Siguiente lección del camino (`course_path`); `null` si es la última. */
  next: { id: string; number: number; title: string } | null;
};

// ── Etapas ──────────────────────────────────────────────────────────────────

/** Intro · video del paso · mini práctica · práctica final · calificación · resumen. */
export type LessonStage =
  | { kind: "intro" }
  | { kind: "video"; step: number }
  | { kind: "mini"; step: number }
  | { kind: "final" }
  | { kind: "rating" }
  | { kind: "summary" };

export const LESSON_STAGE_COUNT = 6;

const STAGE_NUMBER: Record<LessonStage["kind"], number> = {
  intro: 1,
  video: 2,
  mini: 3,
  final: 4,
  rating: 5,
  summary: 6,
};

/** "n / 6" de la barra: video y mini práctica se repiten por paso con el mismo número. */
export function stageNumber(stage: LessonStage): number {
  return STAGE_NUMBER[stage.kind];
}

/** Etapa siguiente: por paso, video → mini práctica; después, final → calificación → resumen. */
export function nextStage(stage: LessonStage, stepCount: number): LessonStage {
  switch (stage.kind) {
    case "intro":
      return stepCount > 0 ? { kind: "video", step: 0 } : { kind: "final" };
    case "video":
      return { kind: "mini", step: stage.step };
    case "mini":
      return stage.step + 1 < stepCount
        ? { kind: "video", step: stage.step + 1 }
        : { kind: "final" };
    case "final":
      return { kind: "rating" };
    default:
      return { kind: "summary" };
  }
}

/** Clave estable de la etapa (para `key` y para mover el foco al cambiar). */
export function stageKey(stage: LessonStage): string {
  return "step" in stage ? `${stage.kind}-${stage.step}` : stage.kind;
}

// ── Canciones y minutos (D097) ──────────────────────────────────────────────

/**
 * Canción de cada práctica: la mini, `practice_song_id` (o la final si no hay); la final,
 * `final_song_id` (o la de práctica). Con la de práctica, review-steps también cuenta la
 * final si la lección no fija una (api.md § review-steps).
 */
export function practiceSongId(
  lesson: Pick<LessonData, "practiceSongId" | "finalSongId">,
  kind: "mini" | "final",
): string | null {
  return kind === "mini"
    ? (lesson.practiceSongId ?? lesson.finalSongId)
    : (lesson.finalSongId ?? lesson.practiceSongId);
}

/** Ms por beat: del BPM promedio de la canción o, sin él, de las anclas extremas. */
function msPerBeat(song: LessonSong): number | null {
  if (song.bpm && song.bpm > 0) return 60000 / song.bpm;
  const grid = song.beatGrid;
  if (grid && grid.length >= 2) {
    const a = grid[0];
    const b = grid[grid.length - 1];
    if (b.beat > a.beat && b.tMs > a.tMs)
      return (b.tMs - a.tMs) / (b.beat - a.beat);
  }
  return null;
}

/** Video que ve el alumno: el de su rol, o el único (`both`). */
export function videoMsFor(
  step: LessonStep,
  role: DanceRole | null,
): number | null {
  return (role ? step.videos[role] : null) ?? step.videos.both ?? null;
}

/**
 * "unos m minutos" (D097): videos del rol + una mini práctica por paso (entrada +
 * `practice_phrases` frases al ritmo de la canción de práctica) + la canción final hasta
 * `dance_end_ms`. Redondeo hacia arriba, mínimo 1. Sin alguna de las canciones (no visible
 * para el alumno) o sin su ritmo, `null`: el texto omite los minutos.
 */
export function estimateMinutes(lesson: LessonData): number | null {
  const songs = new Map(lesson.songs.map((s) => [s.id, s]));
  const miniId = practiceSongId(lesson, "mini");
  const finalId = practiceSongId(lesson, "final");
  const mini = miniId ? songs.get(miniId) : undefined;
  const final = finalId ? songs.get(finalId) : undefined;
  if (!mini || !final || final.danceEndMs === null) return null;
  const beatMs = msPerBeat(mini);
  if (beatMs === null) return null;
  const phrases = lesson.style.leadInPhrases + (lesson.practicePhrases ?? 0);
  const miniMs = phrases * lesson.style.beatsPerPhrase * beatMs;
  const videosMs = lesson.steps.reduce(
    (sum, s) => sum + (videoMsFor(s, lesson.role) ?? 0),
    0,
  );
  const total = videosMs + lesson.steps.length * miniMs + final.danceEndMs;
  return Math.max(1, Math.ceil(total / 60000));
}

// ── Calificación ────────────────────────────────────────────────────────────

/**
 * ¿Vence hoy? Sin tarjeta (paso nuevo) o con `due_at ≤ ahora`, como `isDue` del core. Los que
 * no vencen se pueden saltar ("No vence hoy"); calificarlos igual es válido para review-steps.
 */
export function isStepDue(step: Pick<LessonStep, "dueAt">, now: Date): boolean {
  if (step.dueAt === null) return true;
  const due = Date.parse(step.dueAt);
  return Number.isNaN(due) || due <= now.getTime();
}

/** Rol de la tarjeta: el del perfil; en un estilo sin roles, ninguno (review-steps usa `leader`). */
export function reviewRole(
  lesson: Pick<LessonData, "hasRoles" | "role">,
): DanceRole | undefined {
  return lesson.hasRoles ? (lesson.role ?? undefined) : undefined;
}

export type RatingChoice = SrsRating | "skip";

export type ReviewRequest = {
  context: "lesson";
  sessionId: string;
  lessonId: string;
  reviews: {
    stepId: string;
    role?: DanceRole;
    rating: SrsRating;
    reviewedAt: string;
  }[];
};

/** Cuerpo de review-steps: los pasos calificados (los saltados no van), en el orden de la lección. */
export function buildReviewRequest(
  lesson: Pick<LessonData, "id" | "hasRoles" | "role" | "steps">,
  sessionId: string,
  choices: Readonly<Record<string, RatingChoice | undefined>>,
  at: Date,
): ReviewRequest {
  const role = reviewRole(lesson);
  const reviews = lesson.steps.flatMap((s) => {
    const choice = choices[s.id];
    if (choice === undefined || choice === "skip") return [];
    return [
      {
        stepId: s.id,
        ...(role ? { role } : {}),
        rating: choice,
        reviewedAt: at.toISOString(),
      },
    ];
  });
  return { context: "lesson", sessionId, lessonId: lesson.id, reviews };
}

/** Se puede enviar: cada paso calificado o saltado y al menos uno calificado (sin repasos no hay progreso). */
export function canSubmitRatings(
  steps: readonly Pick<LessonStep, "id">[],
  choices: Readonly<Record<string, RatingChoice | undefined>>,
): boolean {
  const values = steps.map((s) => choices[s.id]);
  return (
    values.every((v) => v !== undefined) && values.some((v) => v !== "skip")
  );
}

export type ReturnDate = { stepId: string; name: string; dueAt: string | null };

/**
 * Fecha de regreso de cada paso para el resumen: la de la tarjeta que devolvió review-steps
 * (del rol calificado; en un estilo sin roles, `leader`); el saltado conserva la suya.
 */
export function returnDates(
  lesson: Pick<LessonData, "hasRoles" | "role" | "steps">,
  cards: readonly { stepId: string; role: string; dueAt: string }[],
): ReturnDate[] {
  const role = lesson.hasRoles ? lesson.role : "leader";
  return lesson.steps.map((s) => {
    const card =
      cards.find((c) => c.stepId === s.id && c.role === role) ??
      cards.find((c) => c.stepId === s.id);
    return { stepId: s.id, name: s.name, dueAt: card?.dueAt ?? s.dueAt };
  });
}

// ── Respuestas de las Edge Functions ────────────────────────────────────────

export type InvokeResult = { status: number; body: unknown };

export type PlanSessionRequest = {
  styleId: string;
  songId: string;
  mode: "lesson";
  lessonId: string;
  focusStepId?: string;
};

export type PlanSessionResponse = {
  sessionId: string;
  plan: { stepId: string; startPhrase: number; phrases: number }[];
  timeline: {
    tMs: number;
    beat: number;
    beatInPhrase: number;
    kind: "count" | "call" | "stepStart" | "end";
    clip: string | null;
    stepId: string | null;
  }[];
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/** La respuesta de plan-session con lo que el escenario usa; `null` si no tiene esa forma. */
export function parsePlanSession(body: unknown): PlanSessionResponse | null {
  if (!isRecord(body)) return null;
  const { sessionId, plan, timeline } = body;
  if (typeof sessionId !== "string" || !Array.isArray(plan)) return null;
  if (!Array.isArray(timeline)) return null;
  const planOk = plan.every(
    (p) =>
      isRecord(p) &&
      typeof p.stepId === "string" &&
      Number.isInteger(p.startPhrase) &&
      Number.isInteger(p.phrases),
  );
  const timelineOk = timeline.every(
    (e) =>
      isRecord(e) &&
      Number.isFinite(e.tMs) &&
      Number.isInteger(e.beat) &&
      typeof e.kind === "string",
  );
  if (!planOk || !timelineOk) return null;
  return body as PlanSessionResponse;
}

/** Tarjetas de la respuesta de review-steps; `null` si no tiene esa forma. */
export function parseReviewCards(
  body: unknown,
): { stepId: string; role: string; dueAt: string }[] | null {
  if (!isRecord(body) || !Array.isArray(body.cards)) return null;
  const cards = body.cards.filter(
    (c): c is { stepId: string; role: string; dueAt: string } =>
      isRecord(c) &&
      typeof c.stepId === "string" &&
      typeof c.role === "string" &&
      typeof c.dueAt === "string",
  );
  return cards.length === body.cards.length ? cards : null;
}

/** Código de error de una Edge Function (`{ error: { code } }`); `null` si no trae. */
export function errorCode(body: unknown): string | null {
  if (!isRecord(body) || !isRecord(body.error)) return null;
  return typeof body.error.code === "string" ? body.error.code : null;
}

/**
 * Qué ve el alumno cuando la práctica no arranca:
 * - `soon`: la canción no está disponible para él (sin publicar ni licencia, D009) o aún no
 *   sirve (sin rejilla, corta, sin plan) → "Práctica disponible pronto".
 * - `subscription`: sin plan activo → Activa tu plan.
 * - `locked`: la lección se cerró (p. ej. otra pestaña) → vuelve al curso.
 * - `offline` / `error`: reintentar.
 */
export type PracticeProblem =
  | "soon"
  | "subscription"
  | "locked"
  | "offline"
  | "error";

const SOON_CODES = new Set([
  "song_not_found",
  "song_not_ready",
  "song_too_short",
  "style_not_ready",
  "no_plan",
]);

export function practiceProblem({
  status,
  body,
}: InvokeResult): PracticeProblem {
  if (status === 0) return "offline";
  const code = errorCode(body);
  if (code && SOON_CODES.has(code)) return "soon";
  if (code === "no_active_subscription") return "subscription";
  if (code === "lesson_locked") return "locked";
  return "error";
}

/** Error al calificar: sin plan activo o cualquier otro (reintentar). */
export function ratingProblem({
  status,
  body,
}: InvokeResult): "subscription" | "offline" | "error" {
  if (status === 0) return "offline";
  return errorCode(body) === "no_active_subscription"
    ? "subscription"
    : "error";
}

// ── Presentación ────────────────────────────────────────────────────────────

/** `id` del título de cada etapa: recibe el foco al cambiar de etapa. */
export const STAGE_TITLE_ID = "lesson-stage-title";

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
 * Cuándo vuelve un paso al repaso, por días de calendario en la zona del dispositivo:
 * `today` · `tomorrow` · `{ date: "jueves 2 de octubre" }`. `null` sin fecha válida.
 */
export function returnDay(
  dueAt: string | null,
  now: Date,
  timeZone?: string,
): "today" | "tomorrow" | { date: string } | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;
  const days = calendarDay(due, timeZone) - calendarDay(now, timeZone);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  const date = new Intl.DateTimeFormat("es-419", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(due)
    .replace(",", "");
  return { date };
}

/** Destinos de la lección (D077: rutas en inglés). */
export const LESSON_LINKS = {
  course: "/app/course",
  lesson: (id: string) => `/app/lessons/${id}`,
} as const;
