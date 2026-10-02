"use client";

import { PracticeResult } from "@/components/practice-result/practice-result";
import type { InvokeResult } from "@/lib/lesson/lesson";
import type {
  PracticeResultData,
  PracticeResultPorts,
  ResultStep,
} from "@/lib/practice-result/result";
import type { SampleState } from "./sample-states";

/**
 * Muestra del resultado sin sesión ni base: una práctica de casino con 3 pasos vencidos y 5 que
 * no vencen hoy, y un review-steps falso que devuelve fechas de ejemplo. Nada se escribe.
 * Copy de ejemplo (CONTENT_CHECKLIST fila 69).
 */

const SAMPLE_NOW = "2026-10-01T15:00:00Z";
const SAMPLE_TZ = "America/Mexico_City";
const DAY_MS = 24 * 60 * 60 * 1000;
const at = (days: number) =>
  new Date(Date.parse(SAMPLE_NOW) + days * DAY_MS).toISOString();

const step = (
  n: number,
  name: string,
  phrases: number,
  dueInDays: number | null,
): ResultStep => ({
  id: `b1000000-0000-4000-8000-00000000000${n}`,
  name,
  phrases,
  dueAt: dueInDays === null ? null : at(dueInDays),
});

const STEPS: ResultStep[] = [
  step(1, "Guapea", 4, -1),
  step(4, "Dile que no", 2, -3),
  step(7, "Enchufla", 2, null),
  step(2, "Básico en cerrada", 2, 2),
  step(5, "Vuelta de la dama", 1, 5),
  step(6, "Vuelta del caballero", 1, 9),
  step(8, "Exhíbela", 1, 3),
  step(9, "Sombrero", 1, 12),
];

function sampleData(state: SampleState): PracticeResultData {
  const steps =
    state === "none-due"
      ? STEPS.map((s, i) => ({ ...s, dueAt: at(i + 1) }))
      : STEPS;
  return {
    sessionId: "sample-session",
    styleId: "a0000000-0000-4000-8000-000000000001",
    styleName: "Salsa casino",
    songId: "c0000000-0000-4000-8000-000000000002",
    songTitle:
      state === "long"
        ? "Pista de prueba 2 · casino medio con un título largo que parte línea"
        : "Pista de prueba 2 · casino medio",
    hasRoles: true,
    role: "leader",
    durationMs: 170_000,
    phrases: 14,
    steps,
    saved:
      state === "saved"
        ? [
            { stepId: STEPS[0].id, rating: 3 },
            { stepId: STEPS[1].id, rating: 2 },
            { stepId: STEPS[2].id, rating: 1 },
            { stepId: STEPS[4].id, rating: 4 },
          ]
        : null,
  };
}

const DAYS_BY_RATING: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8 };

function samplePorts(fail: boolean): PracticeResultPorts {
  return {
    reviewSteps: async (input): Promise<InvokeResult> => {
      await new Promise((r) => setTimeout(r, 600));
      if (fail) return { status: 0, body: null };
      return {
        status: 200,
        body: {
          cards: input.reviews.map((r) => ({
            stepId: r.stepId,
            role: r.role ?? "leader",
            dueAt: at(DAYS_BY_RATING[r.rating]),
            state: "review",
          })),
        },
      };
    },
  };
}

export function ResultSample({ state }: { state: SampleState }) {
  return (
    <PracticeResult
      data={sampleData(state)}
      ports={samplePorts(state === "error")}
      exitHref="/layouts"
      homeHref="/layouts"
      againHref="/layouts/practice"
      now={SAMPLE_NOW}
      timeZone={SAMPLE_TZ}
      initialExpanded={state === "expanded"}
    />
  );
}
