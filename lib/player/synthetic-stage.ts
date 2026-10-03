/**
 * El reproductor real (D030) con la pista sintética (D121) para una sesión del escenario: lo
 * comparten la práctica libre y la Lección (mini práctica y práctica final, D145), así ninguna
 * de las dos programa el audio a su manera. La sesión sale de `practiceStage` (sesión guardada)
 * o de `sessionStage` (respuesta de `plan-session`); la latencia, de la calibración web guardada
 * o, sin ella, la que reporta el navegador (D124).
 */

import type { SessionStage } from "../stage/session-source";
import {
  type AudioStageSource,
  createAudioStageSource,
  type PlayerDeps,
} from "./player";
import { createSyntheticTrack } from "./synthetic-track";

export interface SyntheticStageInput {
  stage: SessionStage;
  /** BPM de la canción: largo del tono del anuncio. */
  bpm: number;
  /** Calibración guardada del alumno (ms); `null` → la del navegador (D032, D124). */
  latencyOffsetMs: number | null;
  /** Solo los tests: reloj y contexto falsos. */
  deps?: Partial<PlayerDeps>;
}

export function createSyntheticStageSource({
  stage,
  bpm,
  latencyOffsetMs,
  deps,
}: SyntheticStageInput): AudioStageSource {
  const { timeline } = stage.session;
  return createAudioStageSource({
    session: stage.session,
    startMs: stage.startMs,
    bpm,
    track: createSyntheticTrack({
      anchors: timeline.anchors,
      beatsPerPhrase: timeline.style.beatsPerPhrase,
      durationMs: timeline.durationMs,
    }),
    latencyOffsetMs,
    ...(deps ? { deps } : {}),
  });
}
