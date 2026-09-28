/**
 * Configuración de un estilo de baile para el motor de ritmo (`docs/spec/motor-de-ritmo.md` §1).
 *
 * Un estilo nuevo es configuración, nunca código (D022): la fila de `dance_styles` se mapea a
 * `StyleConfig` y el resto del motor no sabe de salsa ni de merengue. TS puro (core compartido).
 */

export interface StyleConfig {
  /** Tiempos por frase. */
  beatsPerPhrase: number;
  /** Tiempos (1-based) que dice el coach. */
  spokenBeats: readonly number[];
  /** Tiempo (1-based) de la última frase en que suena el anuncio (D011). */
  callBeat: number;
  /** Tiempos que ocupa el nombre del paso (se silencian esos números). */
  callSpanBeats: number;
  /** Frases de cuenta antes del primer paso. */
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

/** Valores iniciales de merengue (§1): se cuentan los 8 tiempos. */
export const MERENGUE: StyleConfig = {
  beatsPerPhrase: 8,
  spokenBeats: [1, 2, 3, 4, 5, 6, 7, 8],
  callBeat: 5,
  callSpanBeats: 2,
  leadInPhrases: 1,
};

const isInt = (n: number) => Number.isInteger(n);

/** Mismas reglas que los `check` de `dance_styles`, más: sin tiempos hablados repetidos. */
export function assertStyle(style: StyleConfig): void {
  const { beatsPerPhrase: bpp, spokenBeats, callBeat, callSpanBeats } = style;
  if (!isInt(bpp) || bpp < 2 || bpp > 16) {
    throw new Error("beatsPerPhrase debe ser un entero entre 2 y 16");
  }
  if (spokenBeats.length < 1 || spokenBeats.length > bpp) {
    throw new Error("spokenBeats debe tener entre 1 y beatsPerPhrase tiempos");
  }
  if (spokenBeats.some((n) => !isInt(n) || n < 1 || n > bpp)) {
    throw new Error("spokenBeats fuera de 1…beatsPerPhrase");
  }
  if (new Set(spokenBeats).size !== spokenBeats.length) {
    throw new Error("spokenBeats no puede repetir tiempos");
  }
  if (!isInt(callBeat) || callBeat < 1 || callBeat > bpp) {
    throw new Error("callBeat fuera de 1…beatsPerPhrase");
  }
  if (!isInt(callSpanBeats) || callSpanBeats < 1 || callSpanBeats > 4) {
    throw new Error("callSpanBeats debe ser un entero entre 1 y 4");
  }
  if (callBeat + callSpanBeats - 1 > bpp) {
    throw new Error("El anuncio no cabe en la frase");
  }
  if (
    !isInt(style.leadInPhrases) ||
    style.leadInPhrases < 0 ||
    style.leadInPhrases > 4
  ) {
    throw new Error("leadInPhrases debe ser un entero entre 0 y 4");
  }
}
