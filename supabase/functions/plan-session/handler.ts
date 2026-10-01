/**
 * `plan-session` (api.md § plan-session, motor-de-ritmo.md, combinaciones.md, D063–D066).
 *
 * 1. Valida la entrada y lee el estado (`loadState`: suscripción, rol de admin, estilo,
 *    canción, lección, pasos del estilo con el estado del alumno, tarjetas y popularidad).
 * 2. Aplica las reglas: contenido visible para quien llama (el admin ve lo no publicado,
 *    D063), lección desbloqueada, canción con rejilla.
 * 3. Arma el `PlanInput` (pasos permitidos, base, targets, pesos y criterio; D065, D115),
 *    genera el plan con la semilla recibida o una nueva del servidor (D064) y la línea de tiempo.
 * 4. Registra la sesión en una llamada atómica (`createSession` → `ef_plan_session`).
 */

import { type AuthPort, requireUserId } from "../_shared/auth.ts";
import {
  type PlanItem as ComboPlanItem,
  type ComboStep,
  generatePlan,
  PLAN_ORDERS,
  PlanError,
  type PlanInput,
  type PlanOrder,
  type StepWeightFactors,
} from "../_shared/core/combinaciones.ts";
import { type Anchor, assertAnchors } from "../_shared/core/grid.ts";
import { phraseWindow } from "../_shared/core/phrases.ts";
import type { StyleConfig } from "../_shared/core/style.ts";
import {
  buildTimeline,
  type TimelineEvent,
  type PlanItem as TimelinePlanItem,
} from "../_shared/core/timeline.ts";
import type { Enums } from "../_shared/database.types.ts";
import { HttpError, jsonEndpoint } from "../_shared/http.ts";
import {
  integer,
  invalid,
  object,
  oneOf,
  optional,
  uuid,
} from "../_shared/validate.ts";

type Mode = Enums<"session_mode">;
type StepStatus = Enums<"step_status">;

const MODES: readonly Mode[] = ["lesson", "free"];
/** La semilla se guarda tal cual y el core la usa como uint32 (combinaciones.md § PRNG). */
export const MAX_SEED = 4294967295;

// ── Entrada ──────────────────────────────────────────────────────────────────

/** Filtros de pasos de la práctica libre (D065). Ausente = sin ese filtro. */
export interface StepFilters {
  minDifficulty?: number;
  maxDifficulty?: number;
  /** Solo favoritos. */
  favoritesOnly?: boolean;
  /** Incluir los pasos en "aprendiendo" además de los "me lo sé" (por defecto sí). */
  includeLearning?: boolean;
  /** Criterio de los pesos (D115); por defecto `review`. */
  order?: PlanOrder;
}

export interface Input {
  styleId: string;
  songId: string;
  mode: Mode;
  lessonId?: string;
  /** Mini práctica de un paso de la lección (D065). */
  focusStepId?: string;
  stepFilters?: StepFilters;
  seed?: number;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") invalid(path, "true | false");
  return value;
}

function parseFilters(value: unknown): StepFilters {
  const f = object(value, "stepFilters");
  const filters: StepFilters = {
    minDifficulty: optional(f.minDifficulty, (v) =>
      integer(v, 1, 5, "stepFilters.minDifficulty"),
    ),
    maxDifficulty: optional(f.maxDifficulty, (v) =>
      integer(v, 1, 5, "stepFilters.maxDifficulty"),
    ),
    favoritesOnly: optional(f.favoritesOnly, (v) =>
      boolean(v, "stepFilters.favoritesOnly"),
    ),
    includeLearning: optional(f.includeLearning, (v) =>
      boolean(v, "stepFilters.includeLearning"),
    ),
    order: optional(f.order, (v) => oneOf(v, PLAN_ORDERS, "stepFilters.order")),
  };
  if (
    filters.minDifficulty !== undefined &&
    filters.maxDifficulty !== undefined &&
    filters.minDifficulty > filters.maxDifficulty
  ) {
    invalid("stepFilters", "minDifficulty ≤ maxDifficulty");
  }
  // Sin claves indefinidas: es lo que se guarda en `practice_sessions.filters`.
  return Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined),
  ) as StepFilters;
}

export function parseInput(body: unknown): Input {
  const input = object(body, "cuerpo");
  const styleId = uuid(input.styleId, "styleId");
  const songId = uuid(input.songId, "songId");
  const mode = oneOf(input.mode, MODES, "mode");
  const lessonId = optional(input.lessonId, (v) => uuid(v, "lessonId"));
  const focusStepId = optional(input.focusStepId, (v) =>
    uuid(v, "focusStepId"),
  );
  const stepFilters = optional(input.stepFilters, parseFilters);
  const seed = optional(input.seed, (v) => integer(v, 0, MAX_SEED, "seed"));

  if (mode === "lesson" && !lessonId) {
    invalid("lessonId", "la lección (mode lesson)");
  }
  if (mode === "free" && lessonId) {
    invalid("lessonId", "nada en mode free");
  }
  if (mode === "free" && focusStepId) {
    invalid("focusStepId", "nada en mode free");
  }
  // En una lección los pasos los fija el curso: los filtros no aplican.
  if (mode === "lesson" && stepFilters) {
    invalid("stepFilters", "nada en mode lesson");
  }
  return { styleId, songId, mode, lessonId, focusStepId, stepFilters, seed };
}

// ── Puerto de datos ──────────────────────────────────────────────────────────

export interface StyleState {
  id: string;
  published: boolean;
  hasRoles: boolean;
  startPosition: string | null;
  beatsPerPhrase: number;
  spokenBeats: number[];
  callBeat: number;
  callSpanBeats: number;
  leadInPhrases: number;
}

export interface SongState {
  id: string;
  /** Publicada y con licencia vigente. */
  visible: boolean;
  /** Está asociada al estilo pedido (`song_styles`). */
  inStyle: boolean;
  beatGrid: Anchor[] | null;
  danceEndMs: number | null;
}

export interface LessonState {
  id: string;
  /** Estilo del curso de la lección. */
  styleId: string;
  /** Curso y estilo publicados. */
  visible: boolean;
  /** Primera del curso, o la anterior (o ella misma) completada. */
  unlocked: boolean;
  practiceSongId: string | null;
  practicePhrases: number | null;
  /** Pasos de la lección en orden. */
  stepIds: string[];
  /** Pasos de las lecciones anteriores del curso (ya enseñados). */
  previousStepIds: string[];
}

export interface StepState {
  id: string;
  slug: string;
  published: boolean;
  category: Enums<"step_category">;
  /** Dificultad del catálogo (1–5). */
  difficulty: number;
  startPosition: string;
  endPosition: string;
  phrases: number;
  canStart: boolean;
  canEnd: boolean;
  repeatable: boolean;
  status: StepStatus;
  favorite: boolean;
  /** Tarjeta FSRS del rol (D065); `difficulty` solo si ya tuvo un repaso. */
  card: { dueAt: string; difficulty: number | null } | null;
  /** Percentil 0–1 de `step_popularity`; `null` si no aparece. */
  popularity: number | null;
}

export interface PlanSessionState {
  activeSubscription: boolean;
  isAdmin: boolean;
  style: StyleState | null;
  song: SongState | null;
  lesson: LessonState | null;
  /** Todos los pasos del estilo, en orden de catálogo (sort_order, slug). */
  steps: StepState[];
}

export interface SessionWrite {
  styleId: string;
  songId: string;
  mode: Mode;
  lessonId: string | null;
  seed: number;
  filters: Record<string, unknown>;
  phrasesAvailable: number;
  plan: ComboPlanItem[];
  /** Un elemento por paso distinto, con la suma de sus frases. */
  steps: { stepId: string; phrases: number }[];
}

export interface PlanSessionPort {
  loadState(
    userId: string,
    ids: { styleId: string; songId: string; lessonId: string | null },
  ): Promise<PlanSessionState>;
  /** Una sola llamada atómica (lanza `HttpError` con los errores de regla). */
  createSession(userId: string, write: SessionWrite): Promise<string>;
}

export interface Deps {
  auth: AuthPort;
  data: PlanSessionPort;
  now: () => Date;
  /** Semilla nueva en [0, MAX_SEED] cuando la petición no trae una (D064). */
  randomSeed: () => number;
}

/** Semilla del servidor: uint32 de `crypto.getRandomValues` (Deno y bun). */
export function cryptoSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

// ── Cálculo ──────────────────────────────────────────────────────────────────

export interface PlanSessionResult {
  seed: number;
  phrasesAvailable: number;
  plan: ComboPlanItem[];
  unplaced: string[];
  timeline: TimelineEvent[];
  write: SessionWrite;
}

const notFound = (code: string, message: string) =>
  new HttpError(404, code, message);
const conflict = (code: string, message: string) =>
  new HttpError(409, code, message);

function toComboStep(s: StepState): ComboStep {
  return {
    id: s.id,
    startPosition: s.startPosition,
    endPosition: s.endPosition,
    phrases: s.phrases,
    canStart: s.canStart,
    canEnd: s.canEnd,
    repeatable: s.repeatable,
  };
}

/** Pasos permitidos en la práctica libre: los que el alumno sabe, con los filtros (D065). */
function freeSteps(steps: StepState[], f: StepFilters): StepState[] {
  const statuses: StepStatus[] =
    f.includeLearning === false ? ["known"] : ["known", "learning"];
  return steps.filter(
    (s) =>
      statuses.includes(s.status) &&
      (f.minDifficulty === undefined || s.difficulty >= f.minDifficulty) &&
      (f.maxDifficulty === undefined || s.difficulty <= f.maxDifficulty) &&
      (!f.favoritesOnly || s.favorite),
  );
}

/**
 * Calcula la sesión sin escribir nada: reglas, `PlanInput`, plan y línea de tiempo.
 * Lanza `HttpError` con los errores de regla.
 */
export function planSession(
  input: Input,
  state: PlanSessionState,
  now: Date,
  seed: number,
): PlanSessionResult {
  const admin = state.isAdmin;
  const style = state.style;
  if (!style || (!style.published && !admin)) {
    throw notFound("style_not_found", "No encontramos ese estilo.");
  }
  if (!style.startPosition) {
    throw conflict(
      "style_not_ready",
      "El estilo todavía no tiene posición inicial.",
    );
  }
  const song = state.song;
  // Canción no publicada (p. ej. del seed, sin audio): solo el admin (D063).
  if (!song || !song.inStyle || (!song.visible && !admin)) {
    throw notFound("song_not_found", "No encontramos esa canción.");
  }
  const anchors = song.beatGrid ?? [];
  try {
    assertAnchors(anchors);
  } catch {
    throw conflict(
      "song_not_ready",
      "La canción todavía no tiene su rejilla de tiempos.",
    );
  }
  if (song.danceEndMs === null) {
    throw conflict(
      "song_not_ready",
      "La canción todavía no tiene marcado el final del baile.",
    );
  }

  let lesson: LessonState | null = null;
  if (input.mode === "lesson") {
    lesson = state.lesson;
    if (!lesson || lesson.styleId !== style.id || (!lesson.visible && !admin)) {
      throw notFound("lesson_not_found", "No encontramos esa lección.");
    }
    if (!lesson.unlocked && !admin) {
      throw new HttpError(
        403,
        "lesson_locked",
        "Completa la lección anterior para abrir esta.",
      );
    }
    if (input.focusStepId && !lesson.stepIds.includes(input.focusStepId)) {
      invalid("focusStepId", "un paso de la lección");
    }
  }

  const config: StyleConfig = {
    beatsPerPhrase: style.beatsPerPhrase,
    spokenBeats: style.spokenBeats,
    callBeat: style.callBeat,
    callSpanBeats: style.callSpanBeats,
    leadInPhrases: style.leadInPhrases,
  };
  const win = phraseWindow(config, anchors, song.danceEndMs);
  // Mini práctica: pocas frases (las de la lección), sin pasar de las que caben.
  const phrases =
    input.focusStepId && lesson?.practicePhrases
      ? Math.min(win.phrases, lesson.practicePhrases)
      : win.phrases;
  if (phrases === 0) {
    throw conflict(
      "song_too_short",
      "En esta canción no cabe ninguna frase completa.",
    );
  }

  // Contenido visible para quien llama: publicado, o todo para el admin (como la RLS).
  const visible = state.steps.filter((s) => s.published || admin);
  // Criterio de los pesos: solo la práctica libre lo elige (en una lección, `review`).
  const order: PlanOrder = input.stepFilters?.order ?? "review";
  const byId = new Map(visible.map((s) => [s.id, s]));
  const baseSteps = visible.filter(
    (s) => s.category === "base" && s.startPosition === s.endPosition,
  );

  let allowed: StepState[];
  let targets: string[];
  if (lesson && input.focusStepId) {
    // Mini práctica: ese paso, con los ya enseñados en el curso para llegar a su posición
    // de entrada (la enchufla sale de cerrada: hace falta el Dile que sí) y el básico.
    const focus = byId.get(input.focusStepId);
    if (!focus) throw notFound("step_not_found", "Algún paso no existe.");
    const pool = new Set([focus.id, ...lesson.previousStepIds]);
    allowed = visible.filter((s) => pool.has(s.id));
    targets = [focus.id];
  } else if (lesson) {
    // Práctica de la lección: sus pasos, los ya enseñados en el curso y, si caben, los que
    // el alumno ya sabe.
    const pool = new Set([...lesson.stepIds, ...lesson.previousStepIds]);
    allowed = visible.filter((s) => pool.has(s.id) || s.status === "known");
    targets = lesson.stepIds.filter((id) => byId.has(id));
  } else {
    allowed = freeSteps(visible, input.stepFilters ?? {});
    if (allowed.length === 0) {
      throw conflict(
        "no_steps",
        "Ningún paso que sepas cumple los filtros: marca pasos en el catálogo.",
      );
    }
    // Solo el criterio "según repaso" obliga a los vencidos (D115); los demás no tienen targets.
    const nowMs = now.getTime();
    targets =
      order !== "review"
        ? []
        : // Vencidos, del más atrasado al menos; como mucho N (no caben más).
          allowed
            .filter((s) => s.card && new Date(s.card.dueAt).getTime() <= nowMs)
            .map((s, i) => ({ id: s.id, due: new Date(s.card?.dueAt ?? 0), i }))
            .sort((a, b) => a.due.getTime() - b.due.getTime() || a.i - b.i)
            .slice(0, phrases)
            .map((t) => t.id);
  }

  const weights: Record<string, StepWeightFactors> = {};
  for (const s of visible) {
    const w: StepWeightFactors = {};
    if (s.card && new Date(s.card.dueAt).getTime() <= now.getTime()) {
      w.due = true;
    }
    if (s.card?.difficulty != null) w.difficulty = s.card.difficulty;
    if (s.favorite) w.favorite = true;
    if (s.popularity != null) w.popularity = s.popularity;
    // Sin repaso todavía, el criterio "dificultad" usa la del catálogo (D115).
    if (order === "difficulty") w.catalogDifficulty = s.difficulty;
    if (Object.keys(w).length > 0) weights[s.id] = w;
  }

  const planInput: PlanInput = {
    phrases,
    steps: allowed.map(toComboStep),
    baseSteps: baseSteps.map(toComboStep),
    startPosition: style.startPosition,
    targets,
    weights,
    seed,
    startPhrase: win.startPhrase,
    order,
  };
  let result: ReturnType<typeof generatePlan>;
  try {
    result = generatePlan(planInput);
  } catch (error) {
    if (error instanceof PlanError && error.code === "no_plan") {
      throw conflict(
        "no_plan",
        "Con estos pasos no se puede llenar la canción: prueba otros filtros u otra canción.",
      );
    }
    throw error;
  }

  const withSlug: TimelinePlanItem[] = result.plan.map((item) => ({
    ...item,
    slug: (byId.get(item.stepId) as StepState).slug,
  }));
  const timeline = buildTimeline(config, anchors, withSlug);

  const totals = new Map<string, number>();
  for (const item of result.plan) {
    totals.set(item.stepId, (totals.get(item.stepId) ?? 0) + item.phrases);
  }
  const filters: Record<string, unknown> = { ...(input.stepFilters ?? {}) };
  if (input.focusStepId) filters.focusStepId = input.focusStepId;

  return {
    seed,
    phrasesAvailable: phrases,
    plan: result.plan,
    unplaced: result.unplaced,
    timeline,
    write: {
      styleId: style.id,
      songId: song.id,
      mode: input.mode,
      lessonId: lesson?.id ?? null,
      seed,
      filters,
      phrasesAvailable: phrases,
      plan: result.plan,
      steps: [...totals].map(([stepId, total]) => ({
        stepId,
        phrases: total,
      })),
    },
  };
}

export function createHandler(deps: Deps) {
  return jsonEndpoint(async ({ req, body }) => {
    const userId = await requireUserId(req, deps.auth);
    const input = parseInput(body);
    const state = await deps.data.loadState(userId, {
      styleId: input.styleId,
      songId: input.songId,
      lessonId: input.lessonId ?? null,
    });
    // Aviso temprano; la regla la vuelve a comprobar el SQL al escribir.
    if (!state.activeSubscription) {
      throw new HttpError(
        403,
        "no_active_subscription",
        "Necesitas una suscripción activa.",
      );
    }
    const seed = input.seed ?? deps.randomSeed();
    const result = planSession(input, state, deps.now(), seed);
    const sessionId = await deps.data.createSession(userId, result.write);
    return {
      sessionId,
      seed: result.seed,
      phrasesAvailable: result.phrasesAvailable,
      plan: result.plan,
      unplaced: result.unplaced,
      timeline: result.timeline,
    };
  });
}
