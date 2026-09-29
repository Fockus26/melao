/**
 * Vista del escenario (handoff §3 Sesión, layout Compás): qué pinta la UI en el instante `tMs`,
 * derivado de la línea de tiempo del core (`docs/spec/motor-de-ritmo.md` §5) y la rejilla (§2).
 *
 * Función pura, sin reloj: el motor (real o falso) le pasa la posición del reloj de audio ya
 * corregida por la latencia (`posición − latencyOffsetMs`, D032). Lo mismo que el reproductor
 * nativo tendrá que calcular; por eso vive fuera de React y tiene tests con los vectores.
 */

import {
  type Anchor,
  beatInPhrase,
  beatToMs,
  msToBeat,
} from "../../supabase/functions/_shared/core/grid.ts";
import type { StyleConfig } from "../../supabase/functions/_shared/core/style.ts";
import {
  type PlanItem,
  roundMs,
  type TimelineEvent,
} from "../../supabase/functions/_shared/core/timeline.ts";

/** Elemento del plan con el nombre que se muestra (el core solo conoce el slug). */
export interface StagePlanItem extends PlanItem {
  name: string;
}

/** Lo que el escenario necesita de la sesión: estilo, rejilla, eventos y duración del audio. */
export interface StageTimeline {
  style: StyleConfig;
  anchors: readonly Anchor[];
  events: readonly TimelineEvent[];
  /** Duración del archivo de audio en ms. */
  durationMs: number;
}

export interface StageStep {
  stepId: string;
  name: string;
}

/**
 * - `intro`: suena la canción antes de la entrada (sin cuenta).
 * - `leadIn`: frases de cuenta antes del primer paso.
 * - `step`: un paso del plan.
 * - `end`: después del evento `end`.
 */
export type StageSection = "intro" | "leadIn" | "step" | "end";

export interface StageView {
  section: StageSection;
  /** Posición acotada a `0…durationMs`. */
  positionMs: number;
  durationMs: number;
  /** Beat de la rejilla que suena; `null` en `intro` y `end`. */
  beat: number | null;
  /** Tiempo 1-based en la frase; `null` si no hay beat. */
  beatInPhrase: number | null;
  /** El tiempo actual no se cuenta (no está en `spokenBeats`): la cuenta grande pinta "·". */
  silent: boolean;
  /** Paso en curso (solo en `step`). */
  current: StageStep | null;
  /** Frase del paso (o de la entrada) en curso: "frase 2 de 2". */
  phrase: { index: number; count: number } | null;
  /** Paso siguiente; `null` en el último paso y al terminar. */
  next: StageStep | null;
  /** El siguiente es el mismo paso: no hay anuncio ("SE REPITE"). */
  repeats: boolean;
  /** Ya sonó el anuncio del siguiente (desde el `call` hasta que entra, D011). */
  announced: boolean;
  /** Pasos después del siguiente, sin repeticiones consecutivas: "A → B → C". */
  later: StageStep[];
}

/** Máximo de pasos en "DESPUÉS" (handoff §3: "A → B → C"). */
export const LATER_MAX = 3;

const step = (item: StagePlanItem): StageStep => ({
  stepId: item.stepId,
  name: item.name,
});

/**
 * Beat que suena en `tMs`: el mayor beat entero cuyo instante redondeado (como los `tMs` de la
 * línea de tiempo, D040) ya llegó. Así la UI cambia de tiempo en el mismo ms que el evento.
 */
export function activeBeatAt(anchors: readonly Anchor[], tMs: number): number {
  let b = Math.floor(msToBeat(anchors, tMs));
  while (roundMs(beatToMs(anchors, b + 1)) <= tMs) b++;
  while (roundMs(beatToMs(anchors, b)) > tMs) b--;
  return b;
}

/** Pasos después de `from` (índice), saltando los que repiten al anterior. */
function laterSteps(plan: readonly StagePlanItem[], from: number): StageStep[] {
  const out: StageStep[] = [];
  for (let i = from + 1; i < plan.length && out.length < LATER_MAX; i++) {
    if (plan[i].stepId !== plan[i - 1].stepId) out.push(step(plan[i]));
  }
  return out;
}

/**
 * Vista del escenario en `tMs`. El paso, la frase y el tiempo salen de la rejilla y el plan;
 * el anuncio, de la línea de tiempo: `announced` es cierto si el último `call`/`stepStart`
 * que ya pasó es un `call`.
 */
export function stageViewAt(
  timeline: StageTimeline,
  plan: readonly StagePlanItem[],
  tMs: number,
): StageView {
  const { style, anchors, events, durationMs } = timeline;
  const bpp = style.beatsPerPhrase;
  const positionMs = Math.min(Math.max(tMs, 0), Math.max(durationMs, 0));
  const base = {
    positionMs,
    durationMs,
    beat: null,
    beatInPhrase: null,
    silent: false,
    current: null,
    phrase: null,
    repeats: false,
    announced: false,
  };

  const endEvent = events.findLast((e) => e.kind === "end");
  if (plan.length === 0 || events.length === 0 || !endEvent) {
    return { ...base, section: "end", next: null, later: [] };
  }
  if (tMs >= endEvent.tMs) {
    return { ...base, section: "end", next: null, later: [] };
  }
  if (tMs < events[0].tMs) {
    return {
      ...base,
      section: "intro",
      next: step(plan[0]),
      later: laterSteps(plan, 0),
    };
  }

  const beat = activeBeatAt(anchors, tMs);
  const inPhrase = beatInPhrase(beat, bpp);
  const phraseNo = Math.floor(beat / bpp);
  let announced = false;
  for (const e of events) {
    if (e.tMs > tMs) break;
    if (e.kind === "call") announced = true;
    else if (e.kind === "stepStart") announced = false;
  }
  const beatFields = {
    beat,
    beatInPhrase: inPhrase,
    silent: !style.spokenBeats.includes(inPhrase),
  };

  const index = plan.findIndex(
    (p) => phraseNo >= p.startPhrase && phraseNo < p.startPhrase + p.phrases,
  );
  if (index === -1) {
    // Entrada: las `leadInPhrases` frases antes del primer paso.
    const firstLeadIn = plan[0].startPhrase - style.leadInPhrases;
    return {
      ...base,
      ...beatFields,
      section: "leadIn",
      phrase: {
        index: phraseNo - firstLeadIn + 1,
        count: style.leadInPhrases,
      },
      next: step(plan[0]),
      announced,
      later: laterSteps(plan, 0),
    };
  }

  const item = plan[index];
  const nextItem = plan[index + 1];
  return {
    ...base,
    ...beatFields,
    section: "step",
    current: step(item),
    phrase: { index: phraseNo - item.startPhrase + 1, count: item.phrases },
    next: nextItem ? step(nextItem) : null,
    repeats: nextItem?.stepId === item.stepId,
    announced,
    later: nextItem ? laterSteps(plan, index + 1) : [],
  };
}

/** "1:42": minutos y segundos, sin horas (una canción dura menos de una hora). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const s = total % 60;
  return `${Math.floor(total / 60)}:${s < 10 ? "0" : ""}${s}`;
}

/** Tiempos que no se cuentan en la tira (los que no están en `spokenBeats`). */
export function silentBeatsOf(style: StyleConfig): number[] {
  return Array.from({ length: style.beatsPerPhrase }, (_, i) => i + 1).filter(
    (n) => !style.spokenBeats.includes(n),
  );
}
