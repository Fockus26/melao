/**
 * Matemática del planificador "two clocks" (D030): un bucle con timer despierta cada
 * `periodMs` y programa en el reloj de audio lo que cae en los próximos `lookaheadMs`.
 * El timer solo decide *qué* programar; *cuándo suena* lo fija `start(when)`.
 *
 * Todos los tiempos de pista están en ms desde el inicio del archivo; los del contexto, en
 * segundos de `AudioContext.currentTime`. TS puro, sin DOM.
 */

import type { TimelineEvent } from "./timeline";

export interface SchedulerParams {
  /** Cuánto hacia adelante se programa en cada vuelta del bucle. */
  lookaheadMs: number;
  /** Cada cuánto despierta el bucle (timer de UI: solo decide qué programar). */
  periodMs: number;
}

/** Valores elegidos en D030. */
export const DEFAULT_SCHEDULER: SchedulerParams = {
  lookaheadMs: 200,
  periodMs: 25,
};

/** `tProgramado = tMs − latencyOffsetMs` (§6). */
export function programmedMs(tMs: number, latencyOffsetMs: number): number {
  return tMs - latencyOffsetMs;
}

/**
 * Instante del contexto en que debe sonar un evento. `trackStartCtx` es el instante del
 * contexto que corresponde a la posición 0 de la pista (puede estar en el pasado).
 */
export function ctxTimeFor(
  tMs: number,
  latencyOffsetMs: number,
  trackStartCtx: number,
): number {
  return trackStartCtx + programmedMs(tMs, latencyOffsetMs) / 1000;
}

/** Posición de la pista (ms) en el instante `ctxTime` del contexto. */
export function trackPositionMs(
  ctxTime: number,
  trackStartCtx: number,
): number {
  return (ctxTime - trackStartCtx) * 1000;
}

/** Ventana de pista `[fromMs, toMs)` que cubre la vuelta actual del bucle. */
export function lookaheadWindow(
  nowCtx: number,
  trackStartCtx: number,
  lookaheadMs: number,
): { fromMs: number; toMs: number } {
  const fromMs = trackPositionMs(nowCtx, trackStartCtx);
  return { fromMs, toMs: fromMs + lookaheadMs };
}

/**
 * Eventos desde `cursor` cuyo tiempo programado cae antes de `toMs`. Los eventos vienen
 * ordenados por `tMs`, y el offset es constante, así que el orden programado es el mismo.
 */
export function eventsToSchedule(
  events: readonly TimelineEvent[],
  cursor: number,
  toMs: number,
  latencyOffsetMs: number,
): { batch: TimelineEvent[]; nextCursor: number } {
  let i = cursor;
  while (
    i < events.length &&
    programmedMs(events[i].tMs, latencyOffsetMs) < toMs
  ) {
    i++;
  }
  return { batch: events.slice(cursor, i), nextCursor: i };
}

/** Cursor para reanudar en `positionMs`: primer evento cuyo tiempo programado no pasó. */
export function resumeCursor(
  events: readonly TimelineEvent[],
  positionMs: number,
  latencyOffsetMs: number,
): number {
  const i = events.findIndex(
    (e) => programmedMs(e.tMs, latencyOffsetMs) >= positionMs,
  );
  return i === -1 ? events.length : i;
}

/**
 * Nuevo ancla al reanudar: la pista vuelve a sonar en `nowCtx + startDelayS` exactamente
 * desde `positionMs`, así que la posición 0 queda en `nowCtx + startDelayS − positionMs`.
 */
export function resumeAnchor(
  nowCtx: number,
  positionMs: number,
  startDelayS: number,
): number {
  return nowCtx + startDelayS - positionMs / 1000;
}

/**
 * Parámetros de `AudioBufferSourceNode.start(when, offset)` para que la pista suene desde
 * `startAtCtx` respetando el ancla: si el ancla ya pasó se entra con offset; si no, se espera.
 */
export function trackStartArgs(
  trackStartCtx: number,
  startAtCtx: number,
): { when: number; offsetS: number } {
  if (trackStartCtx >= startAtCtx) return { when: trackStartCtx, offsetS: 0 };
  return { when: startAtCtx, offsetS: startAtCtx - trackStartCtx };
}
