/**
 * Calibración de latencia a oído (D142), pura y portable: qué se mide, cómo se resume y cuándo
 * no vale. El cliente pone `CALIBRATION_CLICKS` clics a `CALIBRATION_BPM` en el reloj de audio,
 * toma el instante de cada toque en ese mismo reloj y le pasa a `evaluateCalibration` el desfase
 * de cada toque con **su** clic (el n-ésimo toque con el n-ésimo clic: con Bluetooth la latencia
 * pasa de medio tiempo y el clic "más cercano" sería el siguiente). Los primeros
 * `CALIBRATION_PRACTICE_TAPS` son de práctica; con los demás sale el promedio y el desvío.
 * El rango del ajuste (`LATENCY_MIN_MS…LATENCY_MAX_MS`) lo repite `save_audio_latency()` en
 * Postgres. Contrato: `docs/spec/motor-de-ritmo.md` §6 · vectores `calibracion-*.json`.
 */

export const CALIBRATION_CLICKS = 12;
export const CALIBRATION_PRACTICE_TAPS = 4;
export const CALIBRATION_BPM = 100;
/** Desvío estándar máximo de los toques medidos: por encima, "toques irregulares". */
export const CALIBRATION_MAX_SD_MS = 40;
/** Rango del ajuste: el del handoff (−300…+300) dentro del que admite la tabla (−200…1000). */
export const LATENCY_MIN_MS = -200;
export const LATENCY_MAX_MS = 300;
/** Paso del ajuste fino (− / + y slider). */
export const LATENCY_STEP_MS = 10;

/** Separación entre clics, en ms (600 a 100 BPM). */
export const CALIBRATION_INTERVAL_MS = 60_000 / CALIBRATION_BPM;

/** Toques que cuentan para el resultado. */
export const CALIBRATION_MEASURED_TAPS =
  CALIBRATION_CLICKS - CALIBRATION_PRACTICE_TAPS;

/** Instante de cada clic relativo al primero, en ms. */
export function calibrationClickTimesMs(): number[] {
  return Array.from(
    { length: CALIBRATION_CLICKS },
    (_, i) => i * CALIBRATION_INTERVAL_MS,
  );
}

/**
 * Desfase de cada toque con su clic, en ms (positivo = el toque llegó después). Toques y clics
 * en el mismo reloj y la misma unidad (ms); se emparejan por orden y sobran los toques de más.
 */
export function tapOffsetsMs(
  tapsMs: readonly number[],
  clicksMs: readonly number[],
): number[] {
  return tapsMs
    .slice(0, clicksMs.length)
    .map((tap, i) => tap - (clicksMs[i] as number));
}

export type CalibrationStatus =
  /** Medición válida: se puede guardar. */
  | "ok"
  /** Faltaron toques (se acabaron los clics antes de los 12). */
  | "incomplete"
  /** Desvío de los medidos mayor que `CALIBRATION_MAX_SD_MS`. */
  | "irregular"
  /** Toques parejos pero el promedio cae fuera del rango (p. ej. empezó un clic tarde). */
  | "out_of_range";

export type CalibrationResult = {
  status: CalibrationStatus;
  /** Toques recibidos (de práctica y medidos). */
  taps: number;
  /** Desfase de los toques medidos, en ms, redondeados a 0.1. Vacío si `incomplete`. */
  measuredMs: number[];
  /** Promedio de los medidos redondeado a ms enteros; `null` si `incomplete`. */
  offsetMs: number | null;
  /** Desvío estándar muestral (n − 1) de los medidos, redondeado a 0.1; `null` si `incomplete`. */
  sdMs: number | null;
};

const round1 = (v: number) => Math.round(v * 10) / 10;

function mean(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sampleSd(values: readonly number[]): number {
  const m = mean(values);
  return Math.sqrt(
    values.reduce((a, v) => a + (v - m) ** 2, 0) / (values.length - 1),
  );
}

/**
 * Resume una medición a partir de los desfases de cada toque con su clic (en orden). Prioridad
 * de los avisos: faltan toques → irregulares → fuera de rango.
 */
export function evaluateCalibration(
  offsetsMs: readonly number[],
): CalibrationResult {
  const taps = Math.min(offsetsMs.length, CALIBRATION_CLICKS);
  if (taps < CALIBRATION_CLICKS) {
    return {
      status: "incomplete",
      taps,
      measuredMs: [],
      offsetMs: null,
      sdMs: null,
    };
  }
  const measured = offsetsMs.slice(
    CALIBRATION_PRACTICE_TAPS,
    CALIBRATION_CLICKS,
  );
  const offsetMs = Math.round(mean(measured));
  const sdMs = round1(sampleSd(measured));
  const status: CalibrationStatus =
    sdMs > CALIBRATION_MAX_SD_MS
      ? "irregular"
      : offsetMs < LATENCY_MIN_MS || offsetMs > LATENCY_MAX_MS
        ? "out_of_range"
        : "ok";
  return { status, taps, measuredMs: measured.map(round1), offsetMs, sdMs };
}

/** Ajuste dentro del rango, en ms enteros. */
export function clampLatencyMs(value: number): number {
  return Math.min(LATENCY_MAX_MS, Math.max(LATENCY_MIN_MS, Math.round(value)));
}

/** Un paso de ajuste fino hacia arriba (+1) o abajo (−1), sin salir del rango. */
export function stepLatencyMs(value: number, direction: 1 | -1): number {
  return clampLatencyMs(value + direction * LATENCY_STEP_MS);
}
