/**
 * `review-steps` (api.md § Edge Functions, srs.md, D013, D038, D051).
 *
 * 1. Valida la entrada y resuelve el rol de cada tarjeta (estilo sin roles → `leader`;
 *    estado del catálogo sin rol → el del perfil).
 * 2. Lee el estado actual (`loadState`: suscripción, pasos, tarjetas).
 * 3. Calcula con el core (`reviewCard`, `markKnown`, `markLearning`).
 * 4. Escribe todo en una llamada atómica (`apply` → `ef_review_steps`), que vuelve a
 *    comprobar suscripción y sesión y es idempotente por (sesión, paso, rol).
 */

import { type AuthPort, requireUserId } from "../_shared/auth.ts";
import { markLearning, reviewCard, type SrsCard } from "../_shared/core/srs.ts";
import type { Enums } from "../_shared/database.types.ts";
import { badRequest, HttpError, jsonEndpoint } from "../_shared/http.ts";
import {
  array,
  integer,
  invalid,
  isoDate,
  object,
  oneOf,
  optional,
  uuid,
} from "../_shared/validate.ts";

type Role = Enums<"dance_role">;
type Context = Enums<"review_context">;
type StepStatus = Enums<"step_status">;

const ROLES: readonly Role[] = ["leader", "follower"];
const CONTEXTS: readonly Context[] = ["lesson", "practice", "catalog"];
const STATUSES: readonly StepStatus[] = ["unknown", "learning", "known"];
/** Tope por petición: una sesión califica pocos pasos distintos. */
export const MAX_ITEMS = 100;
/** Rol de la única tarjeta de un paso en un estilo sin roles (D051). */
export const ROLELESS: Role = "leader";

// ── Entrada ──────────────────────────────────────────────────────────────────

export interface ReviewInput {
  stepId: string;
  role?: Role;
  rating: number;
  reviewedAt: Date;
}

export interface StatusInput {
  stepId: string;
  status: StepStatus;
  role?: Role;
}

export interface Input {
  context: Context;
  sessionId?: string;
  lessonId?: string;
  reviews: ReviewInput[];
  status: StatusInput[];
}

export function parseInput(body: unknown): Input {
  const input = object(body, "cuerpo");
  const context = oneOf(input.context, CONTEXTS, "context");
  const sessionId = optional(input.sessionId, (v) => uuid(v, "sessionId"));
  const lessonId = optional(input.lessonId, (v) => uuid(v, "lessonId"));

  const reviews = (
    optional(input.reviews, (v) => array(v, "reviews")) ?? []
  ).map((raw, i): ReviewInput => {
    const item = object(raw, `reviews[${i}]`);
    return {
      stepId: uuid(item.stepId, `reviews[${i}].stepId`),
      role: optional(item.role, (v) => oneOf(v, ROLES, `reviews[${i}].role`)),
      rating: integer(item.rating, 1, 4, `reviews[${i}].rating`),
      reviewedAt: isoDate(item.reviewedAt, `reviews[${i}].reviewedAt`),
    };
  });
  const status = (optional(input.status, (v) => array(v, "status")) ?? []).map(
    (raw, i): StatusInput => {
      const item = object(raw, `status[${i}]`);
      return {
        stepId: uuid(item.stepId, `status[${i}].stepId`),
        status: oneOf(item.status, STATUSES, `status[${i}].status`),
        role: optional(item.role, (v) => oneOf(v, ROLES, `status[${i}].role`)),
      };
    },
  );

  if (reviews.length + status.length === 0) {
    invalid("reviews/status", "al menos un elemento");
  }
  if (reviews.length > MAX_ITEMS || status.length > MAX_ITEMS) {
    invalid("reviews/status", `como mucho ${MAX_ITEMS} elementos cada una`);
  }
  // Sin sesión no hay idempotencia: las calificaciones de lección y práctica la exigen.
  if (reviews.length > 0 && context !== "catalog" && !sessionId) {
    invalid("sessionId", "la sesión calificada (context lesson o practice)");
  }
  if (context === "lesson" && !lessonId) {
    invalid("lessonId", "la lección (context lesson)");
  }
  const statusSteps = new Set(status.map((s) => s.stepId));
  if (statusSteps.size !== status.length) {
    throw badRequest("duplicate_step", "Un paso aparece dos veces en status.");
  }
  if (reviews.some((r) => statusSteps.has(r.stepId))) {
    throw badRequest(
      "duplicate_step",
      "Un paso no puede ir en reviews y en status a la vez.",
    );
  }
  return { context, sessionId, lessonId, reviews, status };
}

// ── Puerto de datos ──────────────────────────────────────────────────────────

/** Tarjeta guardada: la del core (D043) con sus claves. */
export type StoredCard = SrsCard & { step_id: string; role: Role };

export interface ReviewState {
  activeSubscription: boolean;
  profileRole: Role | null;
  steps: { id: string; hasRoles: boolean; status: StepStatus }[];
  cards: StoredCard[];
}

export interface ReviewWrite {
  context: Context;
  sessionId: string | null;
  lessonId: string | null;
  reviews: {
    stepId: string;
    role: Role;
    rating: number;
    reviewedAt: string;
    dueAfter: string | null;
    card: SrsCard;
  }[];
  status: {
    stepId: string;
    status: StepStatus;
    role: Role;
    review?: { rating: number; reviewedAt: string; dueAfter: string | null };
    card?: SrsCard;
  }[];
}

export interface CardSummary {
  stepId: string;
  role: Role;
  dueAt: string;
  state: Enums<"card_state">;
}

export interface ReviewStepsPort {
  loadState(userId: string, stepIds: string[]): Promise<ReviewState>;
  /** Una sola llamada atómica (lanza `HttpError` con los errores de regla). */
  apply(userId: string, write: ReviewWrite): Promise<CardSummary[]>;
}

export interface Deps {
  auth: AuthPort;
  data: ReviewStepsPort;
  now: () => Date;
}

// ── Cálculo ──────────────────────────────────────────────────────────────────

/**
 * Arma lo que se escribe. `reviewedAt` se acota a [último repaso, ahora]: un reloj del
 * cliente adelantado no programa en el futuro y uno atrasado no retrocede la tarjeta.
 */
export function buildWrite(
  input: Input,
  state: ReviewState,
  now: Date,
): ReviewWrite {
  const steps = new Map(state.steps.map((s) => [s.id, s]));
  const cards = new Map(state.cards.map((c) => [`${c.step_id}:${c.role}`, c]));

  const roleFor = (stepId: string, role: Role | undefined, path: string) => {
    const step = steps.get(stepId);
    if (!step) {
      throw new HttpError(404, "step_not_found", "Algún paso no existe.");
    }
    if (!step.hasRoles) return ROLELESS;
    const resolved = role ?? (path === "status" ? state.profileRole : null);
    if (!resolved) {
      throw badRequest(
        "role_required",
        `${path}: falta el rol del paso ${stepId} (y el perfil no tiene uno).`,
      );
    }
    return resolved;
  };

  const seen = new Set<string>();
  const reviews = input.reviews.map((r) => {
    const role = roleFor(r.stepId, r.role, "reviews");
    const key = `${r.stepId}:${role}`;
    if (seen.has(key)) {
      throw badRequest("duplicate_step", "Un paso y rol aparecen dos veces.");
    }
    seen.add(key);
    const current = cards.get(key);
    const last = current?.last_review_at
      ? new Date(current.last_review_at).getTime()
      : Number.NEGATIVE_INFINITY;
    const at = new Date(
      Math.max(Math.min(r.reviewedAt.getTime(), now.getTime()), last),
    );
    const result = reviewCard(current ?? markLearning(at), r.rating, at);
    return {
      stepId: r.stepId,
      role,
      rating: r.rating,
      reviewedAt: result.review.reviewed_at,
      dueAfter: result.review.due_after,
      card: result.card,
    };
  });

  const status = input.status.map((s) => {
    const role = roleFor(s.stepId, s.role, "status");
    if (s.status === "unknown")
      return { stepId: s.stepId, status: s.status, role };
    if (s.status === "learning") {
      return {
        stepId: s.stepId,
        status: s.status,
        role,
        card: markLearning(now),
      };
    }
    // "Me lo sé": repaso Good sobre la tarjeta que haya (o una nueva = markKnown).
    const current = cards.get(`${s.stepId}:${role}`);
    const result = reviewCard(current ?? markLearning(now), 3, now);
    return {
      stepId: s.stepId,
      status: s.status,
      role,
      card: result.card,
      review: {
        rating: result.review.rating,
        reviewedAt: result.review.reviewed_at,
        dueAfter: result.review.due_after,
      },
    };
  });

  return {
    context: input.context,
    sessionId: input.sessionId ?? null,
    lessonId: input.lessonId ?? null,
    reviews,
    status,
  };
}

export function createHandler(deps: Deps) {
  return jsonEndpoint(async ({ req, body }) => {
    const userId = await requireUserId(req, deps.auth);
    const input = parseInput(body);
    const stepIds = [
      ...new Set([...input.reviews, ...input.status].map((i) => i.stepId)),
    ];
    const state = await deps.data.loadState(userId, stepIds);
    // Aviso temprano; la regla la vuelve a comprobar el SQL al escribir.
    if (!state.activeSubscription) {
      throw new HttpError(
        403,
        "no_active_subscription",
        "Necesitas una suscripción activa.",
      );
    }
    const write = buildWrite(input, state, deps.now());
    return { cards: await deps.data.apply(userId, write) };
  });
}
