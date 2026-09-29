/**
 * Repetición espaciada: envoltura de `ts-fsrs` (versión fijada en `package.json` y en
 * `supabase/functions/deno.json`).
 *
 * Contrato: `docs/spec/srs.md` y los vectores `docs/spec/vectors/srs-*.json`. TS puro: las
 * fechas se inyectan (`now`), nunca `new Date()` sin argumentos dentro del core.
 *
 * Formato de la tarjeta (D043): el de la fila de `srs_cards` (snake_case, fechas ISO 8601),
 * sin las claves (`user_id`, `step_id`, `role`) ni `created_at`: la Edge Function la escribe
 * tal cual con `update`/`upsert`.
 *
 * Planificador (D044): parámetros por defecto de FSRS, retención 0.90, sin *fuzz* (determinista)
 * y **sin pasos cortos** (`enable_short_term: false`): los intervalos son en días y los estados
 * `learning`/`relearning` no se usan.
 */

import {
  type Card,
  createEmptyCard,
  fsrs,
  type Grade,
  generatorParameters,
  Rating,
  State,
} from "ts-fsrs";
import type { Enums, Tables } from "../database.types.ts";

/** Retención deseada (srs.md § Tarjeta). */
export const DESIRED_RETENTION = 0.9;

/** Calificación de la UI: 1 Muy difícil · 2 Difícil · 3 Bien · 4 Fácil. */
export type SrsRating = 1 | 2 | 3 | 4;

/** Tarjeta FSRS con los campos de `srs_cards` que calcula el core. */
export type SrsCard = Pick<
  Tables<"srs_cards">,
  | "state"
  | "stability"
  | "difficulty"
  | "due_at"
  | "last_review_at"
  | "reps"
  | "lapses"
>;

/** Datos de la fila de `step_reviews` que calcula el core (el resto lo pone la Edge Function). */
export type SrsReview = Pick<
  Tables<"step_reviews">,
  "rating" | "reviewed_at" | "due_after"
>;

export interface ReviewResult {
  card: SrsCard;
  review: SrsReview;
}

const scheduler = fsrs(
  generatorParameters({
    request_retention: DESIRED_RETENTION,
    enable_fuzz: false,
    enable_short_term: false,
  }),
);

const RATING: Record<SrsRating, Grade> = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
};

const STATE_TO_DB: Record<State, Enums<"card_state">> = {
  [State.New]: "new",
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};

const STATE_FROM_DB: Record<Enums<"card_state">, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

/** Calificación 1–4 → `Rating` de FSRS. Lanza si no es 1, 2, 3 ni 4. */
export function toFsrsRating(rating: number): Grade {
  const g = RATING[rating as SrsRating];
  if (g === undefined) {
    throw new RangeError(`Calificación inválida: ${rating} (se espera 1–4)`);
  }
  return g;
}

function toFsrs(card: SrsCard): Card {
  return {
    due: new Date(card.due_at),
    stability: card.stability,
    difficulty: card.difficulty,
    // `ts-fsrs` recalcula el intervalo desde `last_review`; estos dos no se guardan.
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: card.reps,
    lapses: card.lapses,
    state: STATE_FROM_DB[card.state],
    last_review: card.last_review_at
      ? new Date(card.last_review_at)
      : undefined,
  };
}

function fromFsrs(card: Card): SrsCard {
  return {
    state: STATE_TO_DB[card.state],
    stability: card.stability,
    difficulty: card.difficulty,
    due_at: card.due.toISOString(),
    last_review_at: card.last_review ? card.last_review.toISOString() : null,
    reps: card.reps,
    lapses: card.lapses,
  };
}

/** "Aprendiendo": tarjeta nueva (`new`), vence ya. */
export function markLearning(now: Date): SrsCard {
  return fromFsrs(createEmptyCard(now));
}

/** Registra una calificación: tarjeta siguiente + datos de la fila de `step_reviews`. */
export function reviewCard(
  card: SrsCard,
  rating: number,
  now: Date,
): ReviewResult {
  const grade = toFsrsRating(rating);
  const next = fromFsrs(scheduler.next(toFsrs(card), now, grade).card);
  return {
    card: next,
    review: {
      rating,
      reviewed_at: now.toISOString(),
      due_after: next.due_at,
    },
  };
}

/** "Me lo sé": crea la tarjeta y registra un repaso Good en ese momento. */
export function markKnown(now: Date): ReviewResult {
  return reviewCard(markLearning(now), 3, now);
}

/** "Para hoy": la tarjeta vence en `now` o antes. */
export function isDue(card: SrsCard, now: Date): boolean {
  return new Date(card.due_at).getTime() <= now.getTime();
}
