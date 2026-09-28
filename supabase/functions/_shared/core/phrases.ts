/**
 * Frase de entrada y frases disponibles (`docs/spec/motor-de-ritmo.md` §3, D039). TS puro.
 */

import { type Anchor, beatToMs } from "./grid.ts";
import type { StyleConfig } from "./style.ts";

/**
 * Frases del principio que hacen de entrada porque la intro no alcanza: el menor `k ≥ 0` con
 * `t(beatsPerPhrase · (k − leadInPhrases)) ≥ 0`. Salsa con intro larga → 0; si `t(-8) < 0`,
 * la frase 0 hace de entrada → 1.
 */
export function entryShiftPhrases(
  anchors: readonly Anchor[],
  style: StyleConfig,
): number {
  let k = 0;
  while (
    beatToMs(anchors, style.beatsPerPhrase * (k - style.leadInPhrases)) < 0
  ) {
    k++;
  }
  return k;
}

/** Frases completas `p ≥ 0` con `t(beatsPerPhrase · (p + 1)) ≤ danceEndMs`, desde el beat 0. */
export function availablePhrases(
  anchors: readonly Anchor[],
  danceEndMs: number,
  beatsPerPhrase: number,
): number {
  if (!Number.isFinite(danceEndMs)) {
    throw new Error("danceEndMs debe ser un número finito");
  }
  let n = 0;
  while (beatToMs(anchors, beatsPerPhrase * (n + 1)) <= danceEndMs) n++;
  return n;
}

/** Frases donde van los pasos: el plan empieza en `startPhrase` y cubre `phrases` (= `N`). */
export interface PhraseWindow {
  startPhrase: number;
  phrases: number;
}

/**
 * Ventana del plan (§3–§4): descuenta las frases que se comió la entrada. `phrases` es el
 * `N` que recibe el generador de combinaciones y el "caben N figuras" de la UI (D039).
 */
export function phraseWindow(
  style: StyleConfig,
  anchors: readonly Anchor[],
  danceEndMs: number,
): PhraseWindow {
  const startPhrase = entryShiftPhrases(anchors, style);
  const total = availablePhrases(anchors, danceEndMs, style.beatsPerPhrase);
  return { startPhrase, phrases: Math.max(0, total - startPhrase) };
}
