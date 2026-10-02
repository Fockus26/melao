"use client";

import { LessonFlow } from "@/components/lesson/lesson-flow";
import type { LessonPorts } from "@/lib/lesson/invoke";
import type {
  InvokeResult,
  LessonStage,
  RatingChoice,
} from "@/lib/lesson/lesson";
import { constantGrid } from "@/supabase/functions/_shared/core/grid";
import { SALSA_CASINO } from "@/supabase/functions/_shared/core/style";
import { buildTimeline } from "@/supabase/functions/_shared/core/timeline";
import {
  BPM,
  DAY_MS,
  FIRST_ONE_MS,
  SAMPLE_LESSON,
  SAMPLE_NOW,
  SAMPLE_TZ,
  type SampleStage,
} from "./sample-data";

/**
 * Muestra de la lección sin sesión ni base: la lección 3 del curso del seed con un backend falso.
 * plan-session devuelve un plan fijo con la línea de tiempo del core (la misma cuenta que la
 * real) y review-steps, fechas de ejemplo. Nada se escribe. Copy de ejemplo (fila 56).
 */

type Item = [stepId: string, phrases: number];

function session(items: Item[]): InvokeResult {
  let startPhrase = 1;
  const plan = items.map(([stepId, phrases]) => {
    const item = { stepId, slug: stepId, startPhrase, phrases };
    startPhrase += phrases;
    return item;
  });
  const timeline = buildTimeline(
    SALSA_CASINO,
    constantGrid(BPM, FIRST_ONE_MS),
    plan,
  );
  return {
    status: 200,
    body: {
      sessionId: "sample-session",
      plan: plan.map(({ slug: _slug, ...p }) => p),
      timeline,
    },
  };
}

const DAYS_BY_RATING: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8 };

function samplePorts(unavailable: boolean): LessonPorts {
  return {
    planSession: async (input) =>
      unavailable
        ? {
            status: 404,
            body: {
              error: {
                code: "song_not_found",
                message: "No encontramos esa canción.",
              },
            },
          }
        : input.focusStepId
          ? session([
              ["guapea", 1],
              [input.focusStepId, 2],
              ["guapea", 1],
            ])
          : session([
              ["guapea", 2],
              ["vuelta-derecha", 1],
              ["enchufla", 1],
              ["guapea", 1],
              ["vuelta-derecha", 1],
              ["enchufla", 2],
            ]),
    reviewSteps: async (input) => ({
      status: 200,
      body: {
        cards: input.reviews.map((r) => ({
          stepId: r.stepId,
          role: r.role ?? "leader",
          dueAt: new Date(
            Date.parse(SAMPLE_NOW) + DAYS_BY_RATING[r.rating] * DAY_MS,
          ).toISOString(),
          state: "review",
        })),
      },
    }),
    // Nada se escribe: la sesión de la muestra no existe.
    completeSession: async () => {},
  };
}

const CHOICES: Record<string, RatingChoice> = {
  "vuelta-derecha": 2,
  enchufla: "skip",
};

function initialFor(stage: SampleStage) {
  const at: Record<SampleStage, LessonStage> = {
    intro: { kind: "intro" },
    video: { kind: "video", step: 0 },
    practice: { kind: "mini", step: 0 },
    unavailable: { kind: "mini", step: 0 },
    final: { kind: "final" },
    rating: { kind: "rating" },
    summary: { kind: "summary" },
  };
  return {
    stage: at[stage],
    sessionId: "sample-session",
    ...(stage === "summary"
      ? {
          choices: CHOICES,
          cards: [
            {
              stepId: "vuelta-derecha",
              role: "leader",
              dueAt: new Date(
                Date.parse(SAMPLE_NOW) + 2 * DAY_MS,
              ).toISOString(),
            },
          ],
        }
      : {}),
  };
}

export function LessonSample({ stage }: { stage: SampleStage }) {
  return (
    <LessonFlow
      lesson={SAMPLE_LESSON}
      ports={samplePorts(stage === "unavailable")}
      courseHref="/layouts"
      lessonHref={() => "/layouts/lesson"}
      initial={initialFor(stage)}
      now={SAMPLE_NOW}
      timeZone={SAMPLE_TZ}
    />
  );
}
