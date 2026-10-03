/**
 * Calibrar audífonos (`/app/profile/calibration`): lo que no es regla de negocio. Las reglas
 * (12 clics, 4 de práctica, desvío > 40, rango −200…300) viven en el core compartido
 * (`supabase/functions/_shared/core/calibration.ts`, D142) y se reexportan aquí para la UI.
 */

export {
  CALIBRATION_CLICKS,
  CALIBRATION_INTERVAL_MS,
  CALIBRATION_MAX_SD_MS,
  CALIBRATION_MEASURED_TAPS,
  CALIBRATION_PRACTICE_TAPS,
  type CalibrationResult,
  type CalibrationStatus,
  calibrationClickTimesMs,
  clampLatencyMs,
  evaluateCalibration,
  LATENCY_MAX_MS,
  LATENCY_MIN_MS,
  LATENCY_STEP_MS,
  stepLatencyMs,
  tapOffsetsMs,
} from "@/supabase/functions/_shared/core/calibration.ts";

/** Con qué escucha el alumno: la web no puede saberlo con certeza, así que se pregunta (D143). */
export type AudioOutput = "bluetooth" | "speaker";

export const OUTPUT_LABELS: Record<AudioOutput, string> = {
  bluetooth: "Audífonos Bluetooth",
  speaker: "Altavoz o audífonos con cable",
};

/** Sistema del dispositivo, deducido del user agent (sin versión ni modelo: nada personal). */
export type DeviceOs =
  | "android"
  | "ios"
  | "windows"
  | "mac"
  | "chromeos"
  | "linux"
  | "other";

const OS_LABELS: Record<DeviceOs, string> = {
  android: "Android",
  ios: "iPhone o iPad",
  windows: "Windows",
  mac: "Mac",
  chromeos: "ChromeOS",
  linux: "Linux",
  other: "este dispositivo",
};

/** Orden importa: Android declara "Linux" y ChromeOS también. */
export function deviceOs(userAgent: string): DeviceOs {
  const ua = userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (ua.includes("cros")) return "chromeos";
  if (ua.includes("windows")) return "windows";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "mac";
  if (ua.includes("linux")) return "linux";
  return "other";
}

/**
 * Dispositivo de salida guardado en `audio_latency` (D143): `device_key` =
 * `<salida>:<sistema>` (p. ej. `bluetooth:android`), estable entre sesiones y sin datos
 * personales; `device_label` es lo que lee el alumno en la lista de ajustes.
 */
export function deviceFor(
  output: AudioOutput,
  userAgent: string,
): { key: string; label: string } {
  const os = deviceOs(userAgent);
  return {
    key: `${output}:${os}`,
    label: `${OUTPUT_LABELS[output]} · ${OS_LABELS[os]}`,
  };
}

/** "+180 ms", "0 ms", "-15 ms": con signo, como lo muestra el resultado. */
export function formatOffset(ms: number): string {
  return ms > 0 ? `+${ms} ms` : `${ms} ms`;
}

/** Ajuste guardado de la plataforma web, para la lista de "Sin audífonos". */
export type SavedLatency = {
  deviceKey: string;
  label: string;
  offsetMs: number;
  measuredAt: string;
};

/** Rutas de la pantalla. */
export const CALIBRATION_PATH = "/app/profile/calibration";
