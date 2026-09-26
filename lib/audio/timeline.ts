/**
 * Línea de tiempo del coach (`docs/spec/motor-de-ritmo.md` §1, §3, §5).
 *
 * En producción la calcula la Edge Function `plan-session` (D003); aquí existe solo para
 * alimentar el spike de audio con una línea de tiempo realista. TS puro, sin DOM.
 */

import { type Anchor, beatInPhrase, beatToMs } from "./grid";

export interface StyleConfig {
  beatsPerPhrase: number;
  /** Tiempos (1-based) que dice el coach. */
  spokenBeats: readonly number[];
  /** Tiempo de la última frase en que suena el anuncio (D011). */
  callBeat: number;
  /** Tiempos que ocupa el nombre del paso (se silencian esos números). */
  callSpanBeats: number;
  leadInPhrases: number;
}

/** Valores iniciales de salsa casino (§1). */
export const SALSA_CASINO: StyleConfig = {
  beatsPerPhrase: 8,
  spokenBeats: [1, 2, 3, 5, 6, 7],
  callBeat: 5,
  callSpanBeats: 2,
  leadInPhrases: 1,
};

export interface PlanItem {
  stepId: string;
  slug: string;
  startPhrase: number;
  phrases: number;
}

export type EventKind = "count" | "call" | "stepStart" | "end";

export interface TimelineEvent {
  tMs: number;
  beat: number;
  beatInPhrase: number;
  kind: EventKind;
  clip: string | null;
  stepId: string | null;
}

/**
 * Frases de entrada que hay que desplazar: 0 si la entrada cabe antes del beat 0
 * (`t(-8·leadIn) ≥ 0`); si no, `leadInPhrases` (la frase 0 hace de entrada, §3).
 */
export function entryShiftPhrases(
  anchors: readonly Anchor[],
  style: StyleConfig,
): number {
  const firstEntryBeat = -style.beatsPerPhrase * style.leadInPhrases;
  return beatToMs(anchors, firstEntryBeat) < 0 ? style.leadInPhrases : 0;
}

/** `N`: frases completas `p ≥ 0` con `t(8·(p+1)) ≤ danceEndMs` (§3). */
export function availablePhrases(
  anchors: readonly Anchor[],
  danceEndMs: number,
  beatsPerPhrase: number,
): number {
  let n = 0;
  while (beatToMs(anchors, beatsPerPhrase * (n + 1)) <= danceEndMs) n++;
  return n;
}

const KIND_ORDER: Record<EventKind, number> = {
  stepStart: 0,
  call: 1,
  count: 2,
  end: 3,
};

/**
 * Genera la línea de tiempo de un plan contiguo. La entrada son las `leadInPhrases` frases
 * justo antes de `plan[0].startPhrase`.
 */
export function buildTimeline(
  style: StyleConfig,
  anchors: readonly Anchor[],
  plan: readonly PlanItem[],
): TimelineEvent[] {
  if (plan.length === 0) return [];
  const bpp = style.beatsPerPhrase;
  const events: TimelineEvent[] = [];

  const push = (
    beat: number,
    kind: EventKind,
    clip: string | null,
    stepId: string | null,
  ) => {
    events.push({
      tMs: Math.round(beatToMs(anchors, beat)),
      beat,
      beatInPhrase: beatInPhrase(beat, bpp),
      kind,
      clip,
      stepId,
    });
  };

  // Emite una frase de cuenta; si `call` viene, anuncia ese paso en el callBeat.
  const phrase = (
    firstBeat: number,
    stepId: string | null,
    call: PlanItem | null,
  ) => {
    const silenced = new Set<number>();
    if (call) {
      for (let k = 0; k < style.callSpanBeats; k++) {
        silenced.add(style.callBeat + k);
      }
      push(
        firstBeat + style.callBeat - 1,
        "call",
        `step.${call.slug}`,
        call.stepId,
      );
    }
    for (const n of style.spokenBeats) {
      if (!silenced.has(n))
        push(firstBeat + n - 1, "count", `count.${n}`, stepId);
    }
  };

  const firstPhrase = plan[0].startPhrase;
  for (let e = style.leadInPhrases; e >= 1; e--) {
    phrase((firstPhrase - e) * bpp, null, e === 1 ? plan[0] : null);
  }

  plan.forEach((item, i) => {
    const next = plan[i + 1];
    push(item.startPhrase * bpp, "stepStart", null, item.stepId);
    for (let p = 0; p < item.phrases; p++) {
      const isLast = p === item.phrases - 1;
      // Paso repetido (mismo stepId consecutivo): no hay anuncio.
      const call = isLast && next && next.stepId !== item.stepId ? next : null;
      phrase((item.startPhrase + p) * bpp, item.stepId, call);
    }
  });

  const last = plan[plan.length - 1];
  push((last.startPhrase + last.phrases) * bpp, "end", null, null);

  return events.sort(
    (a, b) => a.tMs - b.tMs || KIND_ORDER[a.kind] - KIND_ORDER[b.kind],
  );
}

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
  const shift = entryShiftPhrases(anchors, style);
  const n = availablePhrases(anchors, danceEndMs, style.beatsPerPhrase);
  const plan = buildSpikePlan(shift, Math.max(0, n - shift));
  return { plan, events: buildTimeline(style, anchors, plan) };
}
