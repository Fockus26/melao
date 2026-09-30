/**
 * Adaptador sesión → escenario: arma la línea de tiempo del escenario (`StageTimeline`) con la
 * respuesta de `plan-session` (plan + eventos) y la canción, para moverla con el motor FALSO
 * (`createFakeStageSource({ session })`) mientras no hay audio (canciones del seed sin audio ni
 * licencia, D009). Cuando llegue el reproductor real, la misma sesión irá al reloj de Web Audio
 * (D030); lo que se hace aquí —la rejilla, los nombres y la ventana que se muestra— le sirve igual.
 */

import {
  type Anchor,
  assertAnchors,
} from "../../supabase/functions/_shared/core/grid.ts";
import type { StyleConfig } from "../../supabase/functions/_shared/core/style.ts";
import type { TimelineEvent } from "../../supabase/functions/_shared/core/timeline.ts";
import type { FakeSession } from "./fake-source";
import type { StagePlanItem } from "./view";

/** Música que se muestra antes de la entrada y después del último paso. */
export const SESSION_INTRO_MS = 1000;
export const SESSION_OUTRO_MS = 1500;

export interface SessionStageInput {
  style: StyleConfig;
  plan: readonly { stepId: string; startPhrase: number; phrases: number }[];
  timeline: readonly TimelineEvent[];
  /** Slug y nombre de cada paso del estilo (el plan usa también los ya enseñados). */
  steps: Readonly<Record<string, { slug: string; name: string }>>;
  /** Rejilla de la canción; sin ella (o inválida) se reconstruye de los eventos. */
  beatGrid?: readonly Anchor[] | null;
  /** Duración del archivo de audio, para no pasar del final. */
  songDurationMs?: number | null;
}

export interface SessionStage {
  session: FakeSession;
  /** Dónde empieza el escenario: un poco antes de la entrada, no al inicio de la canción. */
  startMs: number;
}

/** Nombre de respaldo si el paso no llegó en `steps` (no debería pasar). */
export const UNKNOWN_STEP = "Paso";

/**
 * Anclas desde los eventos: cada evento es un beat entero en un `tMs` ya redondeado (D040),
 * así que entre ellos la interpolación lineal da la misma rejilla (salvo ±1 ms) que la canción.
 */
export function anchorsFromEvents(events: readonly TimelineEvent[]): Anchor[] {
  const byBeat = new Map<number, number>();
  for (const e of events) if (!byBeat.has(e.beat)) byBeat.set(e.beat, e.tMs);
  const sorted = [...byBeat]
    .map(([beat, tMs]) => ({ beat, tMs }))
    .sort((a, b) => a.beat - b.beat);
  const out: Anchor[] = [];
  for (const a of sorted) {
    const prev = out[out.length - 1];
    if (!prev || a.tMs > prev.tMs) out.push(a);
  }
  return out;
}

function validGrid(
  grid: readonly Anchor[] | null | undefined,
): Anchor[] | null {
  if (!grid) return null;
  try {
    assertAnchors(grid);
    return [...grid];
  } catch {
    return null;
  }
}

/** Arma la sesión del escenario. Lanza si no hay eventos para mover el escenario. */
export function sessionStage(input: SessionStageInput): SessionStage {
  const events = [...input.timeline].sort((a, b) => a.tMs - b.tMs);
  const first = events[0];
  const end = events.findLast((e) => e.kind === "end");
  if (!first || !end) throw new Error("La sesión no trae línea de tiempo");
  const anchors = validGrid(input.beatGrid) ?? anchorsFromEvents(events);
  assertAnchors(anchors);

  const plan: StagePlanItem[] = input.plan.map((item) => {
    const step = input.steps[item.stepId];
    return {
      stepId: item.stepId,
      startPhrase: item.startPhrase,
      phrases: item.phrases,
      slug: step?.slug ?? item.stepId,
      name: step?.name ?? UNKNOWN_STEP,
    };
  });
  const songEnd = input.songDurationMs ?? Number.POSITIVE_INFINITY;
  const durationMs = Math.min(songEnd, end.tMs + SESSION_OUTRO_MS);
  return {
    session: {
      timeline: { style: input.style, anchors, events, durationMs },
      plan,
    },
    startMs: Math.max(0, first.tMs - SESSION_INTRO_MS),
  };
}
