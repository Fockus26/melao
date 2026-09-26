/**
 * Rejilla de beats por anclas (D010, `docs/spec/motor-de-ritmo.md` §2).
 *
 * TS puro, sin DOM: lo usa el spike de audio y es candidato a moverse al core compartido
 * (`supabase/functions/_shared/core/`) cuando se implemente el motor de verdad (07a).
 */

export interface Anchor {
  /** Beat entero; `0` = el primer "1" en que se baila. */
  beat: number;
  /** Milisegundos desde el inicio del archivo de audio. */
  tMs: number;
}

function assertAnchors(anchors: readonly Anchor[]): void {
  if (anchors.length < 2) {
    throw new Error("La rejilla necesita al menos 2 anclas");
  }
  for (let i = 1; i < anchors.length; i++) {
    if (anchors[i].beat <= anchors[i - 1].beat) {
      throw new Error("Las anclas deben estar ordenadas por beat, sin repetir");
    }
    if (anchors[i].tMs <= anchors[i - 1].tMs) {
      throw new Error("Las anclas deben avanzar en el tiempo");
    }
  }
}

/** Rejilla de BPM constante: el caso del spike (pista sintética o BPM tecleado). */
export function constantGrid(bpm: number, firstOneMs: number): Anchor[] {
  if (!(bpm > 0)) throw new Error("BPM inválido");
  return [
    { beat: 0, tMs: firstOneMs },
    { beat: 1, tMs: firstOneMs + 60000 / bpm },
  ];
}

/** Índice `i` del segmento `[anchors[i], anchors[i+1]]` que usa `value` (extrapola en los bordes). */
function segmentIndex(
  anchors: readonly Anchor[],
  value: number,
  key: "beat" | "tMs",
): number {
  let i = 0;
  while (i < anchors.length - 2 && value >= anchors[i + 1][key]) i++;
  return i;
}

/** `t(b)`: interpolación lineal entre las anclas que rodean `b`; fuera, el segmento más cercano. */
export function beatToMs(anchors: readonly Anchor[], beat: number): number {
  assertAnchors(anchors);
  const i = segmentIndex(anchors, beat, "beat");
  const a = anchors[i];
  const b = anchors[i + 1];
  return a.tMs + ((beat - a.beat) * (b.tMs - a.tMs)) / (b.beat - a.beat);
}

/** Inversa de `beatToMs`: beat fraccionario en el instante `tMs` (para la UI). */
export function msToBeat(anchors: readonly Anchor[], tMs: number): number {
  assertAnchors(anchors);
  const i = segmentIndex(anchors, tMs, "tMs");
  const a = anchors[i];
  const b = anchors[i + 1];
  return a.beat + ((tMs - a.tMs) * (b.beat - a.beat)) / (b.tMs - a.tMs);
}

/** Tiempo 1-based dentro de la frase (también para beats negativos de la entrada). */
export function beatInPhrase(beat: number, beatsPerPhrase: number): number {
  return (((beat % beatsPerPhrase) + beatsPerPhrase) % beatsPerPhrase) + 1;
}
