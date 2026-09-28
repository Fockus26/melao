/**
 * Línea de tiempo del coach (`docs/spec/motor-de-ritmo.md` §5, D011, D040, D041).
 *
 * La calcula la Edge Function `plan-session` (D003); los clientes solo disparan clips en esos
 * `tMs`. Sin latencia: `tMs` es relativo al archivo de audio (D032). TS puro.
 */

import { type Anchor, beatInPhrase, beatToMs } from "./grid.ts";
import { assertStyle, type StyleConfig } from "./style.ts";

/** Un elemento del plan con el slug del paso (el clip del anuncio es `step.<slug>`). */
export interface PlanItem {
  stepId: string;
  slug: string;
  startPhrase: number;
  phrases: number;
}

export type EventKind = "count" | "call" | "stepStart" | "end";

export interface TimelineEvent {
  /** Ms enteros desde el inicio del archivo de audio (D040). */
  tMs: number;
  beat: number;
  beatInPhrase: number;
  kind: EventKind;
  clip: string | null;
  /** `count`/`stepStart`: el paso en curso (`null` en la entrada); `call`: el anunciado. */
  stepId: string | null;
}

/** Desempate de eventos en el mismo beat (D041). */
export const KIND_ORDER: Readonly<Record<EventKind, number>> = {
  stepStart: 0,
  call: 1,
  count: 2,
  end: 3,
};

/** Redondeo de `tMs` a ms enteros: mitad hacia +∞ (`floor(x + 0.5)`), igual en toda plataforma. */
export function roundMs(ms: number): number {
  return Math.floor(ms + 0.5);
}

/** El plan es contiguo, empieza en una frase ≥ 0 y cada paso dura al menos una frase (§4). */
export function assertPlan(plan: readonly PlanItem[]): void {
  plan.forEach((item, i) => {
    if (!Number.isInteger(item.startPhrase) || item.startPhrase < 0) {
      throw new Error("startPhrase debe ser un entero ≥ 0");
    }
    if (!Number.isInteger(item.phrases) || item.phrases < 1) {
      throw new Error("Cada paso dura al menos una frase entera");
    }
    const prev = plan[i - 1];
    if (prev && item.startPhrase !== prev.startPhrase + prev.phrases) {
      throw new Error("El plan debe ser contiguo");
    }
  });
}

/**
 * Genera la línea de tiempo de un plan contiguo. La entrada son las `leadInPhrases` frases
 * justo antes de `plan[0].startPhrase`; en la última se anuncia el primer paso.
 */
export function buildTimeline(
  style: StyleConfig,
  anchors: readonly Anchor[],
  plan: readonly PlanItem[],
): TimelineEvent[] {
  assertStyle(style);
  assertPlan(plan);
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
      tMs: roundMs(beatToMs(anchors, beat)),
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

  // Por beat (tMs es monótono en el beat) y, en el mismo beat, por KIND_ORDER.
  return events.sort(
    (a, b) => a.beat - b.beat || KIND_ORDER[a.kind] - KIND_ORDER[b.kind],
  );
}
