/** Estadística de las mediciones del spike (calibración por toques y deriva de reloj). TS puro. */

export function mean(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Desviación estándar muestral (n − 1). */
export function stdDev(values: readonly number[]): number {
  if (values.length < 2) return Number.NaN;
  const m = mean(values);
  return Math.sqrt(
    values.reduce((a, v) => a + (v - m) ** 2, 0) / (values.length - 1),
  );
}

/**
 * Desfase de cada toque respecto del acento más cercano, en ms (positivo = el toque llegó
 * después). Ambos en segundos del mismo reloj. `accents` ordenado.
 */
export function tapOffsetsMs(
  taps: readonly number[],
  accents: readonly number[],
): number[] {
  if (accents.length === 0) return [];
  return taps.map((tap) => {
    let best = accents[0];
    for (const a of accents) {
      if (Math.abs(tap - a) < Math.abs(tap - best)) best = a;
    }
    return (tap - best) * 1000;
  });
}

export interface ClockSample {
  /** `AudioTimestamp.contextTime` (s). */
  contextTime: number;
  /** `AudioTimestamp.performanceTime` (ms). */
  performanceTime: number;
}

/**
 * Deriva del reloj de audio frente al de pared en un tramo sin pausas: cuánto se adelantó
 * (positivo) o atrasó el reloj de audio en total, y la pendiente en partes por millón.
 */
export function clockDrift(samples: readonly ClockSample[]): {
  elapsedS: number;
  driftMs: number;
  ppm: number;
} | null {
  if (samples.length < 2) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const wallMs = last.performanceTime - first.performanceTime;
  if (wallMs <= 0) return null;
  const audioMs = (last.contextTime - first.contextTime) * 1000;
  const driftMs = audioMs - wallMs;
  return { elapsedS: wallMs / 1000, driftMs, ppm: (driftMs / wallMs) * 1e6 };
}
