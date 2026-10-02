import type { DanceRole } from "@/lib/course/path";
import type { InvokeResult } from "@/lib/lesson/lesson";
import { isStepDue } from "@/lib/lesson/lesson";
import type { SrsRating } from "@/supabase/functions/_shared/core/srs";
import type { TimelineEvent } from "@/supabase/functions/_shared/core/timeline";

/**
 * Resultado de la práctica libre (`/app/practice/result?id=`, pantallas.md): tipos, qué pasos
 * son obligatorios, cuándo se puede guardar y el cuerpo de `review-steps`. Sin reglas de negocio
 * (D003): qué vence lo dice la tarjeta (`srs_cards.due_at`, como `isDue` del core) y el repaso lo
 * programa `review-steps` (D013). TS puro: lo prueban los tests y lo copian Android/iOS.
 */

export type ResultStep = {
  id: string;
  name: string;
  /** Frases que bailó en la sesión (`practice_session_steps.phrases`). */
  phrases: number;
  /** `due_at` de la tarjeta del rol del alumno; `null` = sin tarjeta (vence, como en la lección). */
  dueAt: string | null;
};

/** Calificación ya guardada de un paso de esta sesión (`step_reviews` con su `session_id`). */
export type SavedReview = { stepId: string; rating: SrsRating };

export type PracticeResultData = {
  sessionId: string;
  styleId: string;
  styleName: string;
  songId: string;
  songTitle: string;
  hasRoles: boolean;
  /** Rol del perfil (D023); `null` si aún no eligió. */
  role: DanceRole | null;
  /** Lo bailado: de la primera cuenta al fin de la línea de tiempo recalculada (ms). */
  durationMs: number;
  /** Frases bailadas (suma del plan, sin la entrada). */
  phrases: number;
  /** Pasos distintos de la sesión, en el orden en que aparecieron. */
  steps: ResultStep[];
  /** Si la sesión ya se calificó: lo guardado (no se recalifica, D126); si no, `null`. */
  saved: SavedReview[] | null;
};

/**
 * Lo bailado en ms: de la primera cuenta al evento `end` de la línea de tiempo (la que se
 * recalcula del plan guardado, como en la sesión). Sin eventos o sin fin, 0.
 */
export function dancedMs(
  events: readonly Pick<TimelineEvent, "tMs" | "kind">[],
): number {
  if (events.length === 0) return 0;
  const first = Math.min(...events.map((e) => e.tMs));
  const end = events.filter((e) => e.kind === "end").map((e) => e.tMs);
  return end.length > 0 ? Math.max(0, Math.max(...end) - first) : 0;
}

/** Frases bailadas: la suma de las del plan (la entrada no cuenta). */
export function dancedPhrases(plan: readonly { phrases: number }[]): number {
  return plan.reduce((sum, p) => sum + p.phrases, 0);
}

/** Vencidos (obligatorios) y los que no vencen hoy (opcionales, plegados). */
export function splitSteps<T extends Pick<ResultStep, "dueAt">>(
  steps: readonly T[],
  now: Date,
): { due: T[]; optional: T[] } {
  const due: T[] = [];
  const optional: T[] = [];
  for (const s of steps) (isStepDue(s, now) ? due : optional).push(s);
  return { due, optional };
}

export type Choices = Readonly<Record<string, SrsRating | undefined>>;

/**
 * Por qué no se puede guardar todavía: falta calificar `n` vencidos, o (sin vencidos) no hay
 * ninguna calificación (`review-steps` exige al menos un repaso). `null` = se puede.
 */
export function saveBlocker(
  steps: readonly Pick<ResultStep, "id" | "dueAt">[],
  choices: Choices,
  now: Date,
): { kind: "due"; missing: number } | { kind: "none" } | null {
  const { due } = splitSteps(steps, now);
  const missing = due.filter((s) => choices[s.id] === undefined).length;
  if (missing > 0) return { kind: "due", missing };
  if (!steps.some((s) => choices[s.id] !== undefined)) return { kind: "none" };
  return null;
}

export type PracticeReviewRequest = {
  context: "practice";
  sessionId: string;
  reviews: {
    stepId: string;
    role?: DanceRole;
    rating: SrsRating;
    reviewedAt: string;
  }[];
};

/**
 * Cuerpo de `review-steps`: los pasos calificados (los opcionales sin calificar no van), en el
 * orden de la sesión. Rol del perfil si el estilo tiene roles; sin roles, ninguno (`leader`).
 * Reenviarlo no cambia nada: el repaso es único por `(sessionId, stepId, role)` (api.md).
 */
export function buildPracticeReview(
  data: Pick<PracticeResultData, "sessionId" | "hasRoles" | "role" | "steps">,
  choices: Choices,
  at: Date,
): PracticeReviewRequest {
  const role = data.hasRoles ? (data.role ?? undefined) : undefined;
  const reviews = data.steps.flatMap((s) => {
    const rating = choices[s.id];
    if (rating === undefined) return [];
    return [
      {
        stepId: s.id,
        ...(role ? { role } : {}),
        rating,
        reviewedAt: at.toISOString(),
      },
    ];
  });
  return { context: "practice", sessionId: data.sessionId, reviews };
}

export type ResultLine = {
  stepId: string;
  name: string;
  /** `null` = no se calificó (opcional saltado): conserva su fecha. */
  rating: SrsRating | null;
  dueAt: string | null;
};

/**
 * Lo guardado, paso por paso: su calificación y la fecha de regreso (la tarjeta del rol que
 * devolvió `review-steps`, o la que ya tenía).
 */
export function resultLines(
  data: Pick<PracticeResultData, "hasRoles" | "role" | "steps">,
  saved: readonly SavedReview[],
  cards: readonly { stepId: string; role: string; dueAt: string }[] = [],
): ResultLine[] {
  const role = data.hasRoles ? data.role : "leader";
  const ratings = new Map(saved.map((r) => [r.stepId, r.rating]));
  return data.steps.map((s) => {
    const card =
      cards.find((c) => c.stepId === s.id && c.role === role) ??
      cards.find((c) => c.stepId === s.id);
    return {
      stepId: s.id,
      name: s.name,
      rating: ratings.get(s.id) ?? null,
      dueAt: card?.dueAt ?? s.dueAt,
    };
  });
}

/** Lo que el resultado le pide al backend; la muestra (`/layouts/practice-result`) pasa uno falso. */
export interface PracticeResultPorts {
  reviewSteps(input: PracticeReviewRequest): Promise<InvokeResult>;
}

/** "Otra vez": el configurador con la misma canción y estilo (contrato de la tanda). */
export const RESULT_LINKS = {
  practice: "/app/practice",
  home: "/app",
  result: (id: string) => `/app/practice/result?id=${encodeURIComponent(id)}`,
} as const;
