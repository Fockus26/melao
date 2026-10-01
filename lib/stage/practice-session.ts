/**
 * Sesión de práctica guardada → escenario. `practice_sessions` guarda el plan y la semilla, no la
 * línea de tiempo (api.md: "La línea de tiempo no se guarda"): aquí se recalcula con el core
 * (`buildTimeline`) desde el plan, el estilo y la rejilla de la canción, y sale idéntica a la que
 * devolvió `plan-session` (mismo core, mismas entradas). TS puro: lo prueban los tests con los
 * vectores `timeline-*.json`; Android/iOS hacen lo mismo con su copia del core.
 */

import {
  type Anchor,
  assertAnchors,
  beatToMs,
} from "../../supabase/functions/_shared/core/grid.ts";
import type { StyleConfig } from "../../supabase/functions/_shared/core/style.ts";
import {
  buildTimeline,
  type TimelineEvent,
} from "../../supabase/functions/_shared/core/timeline.ts";
import { type SessionStage, sessionStage } from "./session-source";

/** Elemento del plan tal como lo guarda `plan-session` (sin slug). */
export interface StoredPlanItem {
  stepId: string;
  startPhrase: number;
  phrases: number;
}

export type StepNames = Readonly<
  Record<string, { slug: string; name: string }>
>;

/** Lo que la página de la sesión le pasa al escenario. */
export interface PracticeSessionData {
  sessionId: string;
  /** "Salsa casino". */
  styleName: string;
  bpm: number;
  style: StyleConfig;
  plan: StoredPlanItem[];
  steps: StepNames;
  beatGrid: Anchor[];
  songDurationMs: number | null;
  /** Calibración del alumno en web (ms); `null` → la que reporta el navegador (D124). */
  latencyOffsetMs: number | null;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/** Plan de `practice_sessions.plan`; `null` si no tiene la forma esperada. */
export function parseStoredPlan(value: unknown): StoredPlanItem[] | null {
  if (!Array.isArray(value)) return null;
  const out: StoredPlanItem[] = [];
  for (const item of value) {
    if (
      !isObject(item) ||
      typeof item.stepId !== "string" ||
      !Number.isInteger(item.startPhrase) ||
      !Number.isInteger(item.phrases)
    ) {
      return null;
    }
    out.push({
      stepId: item.stepId,
      startPhrase: item.startPhrase as number,
      phrases: item.phrases as number,
    });
  }
  return out;
}

/** Rejilla de `songs.beat_grid`; `null` si falta o no es válida (§2). */
export function parseBeatGrid(value: unknown): Anchor[] | null {
  if (!Array.isArray(value)) return null;
  const out = value.flatMap((a) =>
    isObject(a) && Number.isInteger(a.beat) && Number.isFinite(a.tMs)
      ? [{ beat: a.beat as number, tMs: a.tMs as number }]
      : [],
  );
  if (out.length !== value.length) return null;
  try {
    assertAnchors(out);
    return out;
  } catch {
    return null;
  }
}

/** BPM del primer tiempo de la rejilla (si la canción no trae `bpm`). */
export function gridBpm(anchors: readonly Anchor[]): number {
  return 60000 / (beatToMs(anchors, 1) - beatToMs(anchors, 0));
}

/** La línea de tiempo del plan guardado: la misma salida que dio `plan-session`. */
export function recomputeTimeline(
  style: StyleConfig,
  anchors: readonly Anchor[],
  plan: readonly StoredPlanItem[],
  steps: StepNames,
): TimelineEvent[] {
  return buildTimeline(
    style,
    anchors,
    // Un paso que ya no existe conserva su id como slug: su anuncio no tendrá clip.
    plan.map((p) => ({ ...p, slug: steps[p.stepId]?.slug ?? p.stepId })),
  );
}

/** Sesión del escenario (línea de tiempo + plan con nombres + desde dónde empieza). */
export function practiceStage(data: PracticeSessionData): SessionStage {
  return sessionStage({
    style: data.style,
    plan: data.plan,
    timeline: recomputeTimeline(
      data.style,
      data.beatGrid,
      data.plan,
      data.steps,
    ),
    steps: data.steps,
    beatGrid: data.beatGrid,
    songDurationMs: data.songDurationMs,
  });
}

/** Enlaces de la sesión (contrato de la tanda 2026-10-01). */
export const SESSION_LINKS = {
  session: (id: string) => `/app/practice/session?id=${encodeURIComponent(id)}`,
  result: (id: string) => `/app/practice/result?id=${encodeURIComponent(id)}`,
  practice: "/app/practice",
} as const;
