/**
 * Línea de tiempo del coach: la lógica vive en el core compartido
 * (`supabase/functions/_shared/core/`, `docs/spec/motor-de-ritmo.md` §1, §3, §5) y aquí se
 * re-exporta. Lo único propio de este módulo es el plan ficticio del spike de audio.
 */

import type { Anchor } from "../../supabase/functions/_shared/core/grid.ts";
import { phraseWindow } from "../../supabase/functions/_shared/core/phrases.ts";
import type { StyleConfig } from "../../supabase/functions/_shared/core/style.ts";
import {
  buildTimeline,
  type PlanItem,
  type TimelineEvent,
} from "../../supabase/functions/_shared/core/timeline.ts";

export {
  availablePhrases,
  entryShiftPhrases,
  type PhraseWindow,
  phraseWindow,
} from "../../supabase/functions/_shared/core/phrases.ts";
export {
  assertStyle,
  MERENGUE,
  SALSA_CASINO,
  type StyleConfig,
} from "../../supabase/functions/_shared/core/style.ts";
export {
  buildTimeline,
  type EventKind,
  type PlanItem,
  type TimelineEvent,
} from "../../supabase/functions/_shared/core/timeline.ts";

/** Pasos ficticios del spike: base repetida (sin anuncio) y cambios (con anuncio). */
const SPIKE_STEPS: readonly Omit<PlanItem, "startPhrase">[] = [
  { stepId: "base", slug: "base", phrases: 2 },
  { stepId: "base", slug: "base", phrases: 1 },
  { stepId: "enchufla", slug: "enchufla", phrases: 1 },
  { stepId: "dile-que-no", slug: "dile-que-no", phrases: 2 },
  { stepId: "sombrero", slug: "sombrero", phrases: 1 },
  { stepId: "sombrero", slug: "sombrero", phrases: 1 },
];

/** Plan contiguo que cubre exactamente las frases `[fromPhrase, fromPhrase + count)`. */
export function buildSpikePlan(fromPhrase: number, count: number): PlanItem[] {
  const plan: PlanItem[] = [];
  let phrase = fromPhrase;
  let left = count;
  let i = 0;
  while (left > 0) {
    const step = SPIKE_STEPS[i % SPIKE_STEPS.length];
    const phrases = Math.min(step.phrases, left);
    plan.push({ ...step, startPhrase: phrase, phrases });
    phrase += phrases;
    left -= phrases;
    i++;
  }
  return plan;
}

/** Plan + línea de tiempo del spike para una rejilla y un fin de baile dados. */
export function buildSpikeSession(
  style: StyleConfig,
  anchors: readonly Anchor[],
  danceEndMs: number,
): { plan: PlanItem[]; events: TimelineEvent[] } {
  const { startPhrase, phrases } = phraseWindow(style, anchors, danceEndMs);
  const plan = buildSpikePlan(startPhrase, phrases);
  return { plan, events: buildTimeline(style, anchors, plan) };
}
