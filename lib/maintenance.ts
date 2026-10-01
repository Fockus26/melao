/**
 * Modo mantenimiento (D111). Puro: sin Next ni React, para probarlo con `bun test` y que
 * `proxy.ts` y `app/maintenance/page.tsx` lean las mismas reglas.
 *
 * - `MAINTENANCE_MODE=1` (o `true`) lo enciende: toda ruta salvo las exentas se reescribe a
 *   `/maintenance` con estado 503.
 * - `MAINTENANCE_UNTIL` (ISO 8601, opcional): hora estimada de vuelta. Da la cabecera
 *   `Retry-After` y la fila "Volvemos aproximadamente" de la pantalla.
 */

export const MAINTENANCE_PATH = "/maintenance";

type Env = Record<string, string | undefined>;

export function isMaintenanceOn(env: Env): boolean {
  const value = env.MAINTENANCE_MODE?.trim().toLowerCase();
  return value === "1" || value === "true";
}

/** Hora estimada de vuelta; `null` si falta o no es una fecha válida. */
export function maintenanceUntil(env: Env): Date | null {
  const raw = env.MAINTENANCE_UNTIL?.trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Rutas que siguen respondiendo durante el mantenimiento: los enlaces de correo de auth
 * (`/auth/*`, para no quemar un enlace de un solo uso), los internos de Next y cualquier archivo
 * (manifest, robots, íconos: llevan extensión en el último segmento). `/maintenance` no está:
 * visitada directo también sale con 503 (el proxy no se vuelve a ejecutar tras reescribir).
 */
export function bypassesMaintenance(path: string): boolean {
  if (path === "/auth" || path.startsWith("/auth/")) return true;
  if (path.startsWith("/_next/")) return true;
  const last = path.split("/").pop() ?? "";
  return last.includes(".");
}

/** ¿Esta petición se reescribe a la pantalla de mantenimiento? */
export function shouldServeMaintenance(path: string, env: Env): boolean {
  return isMaintenanceOn(env) && !bypassesMaintenance(path);
}

/**
 * Valor de `Retry-After` en segundos hasta `until` (redondeado hacia arriba). `null` si no hay
 * hora o ya pasó: sin cabecera, el cliente decide cuándo volver.
 */
export function retryAfterSeconds(
  until: Date | null,
  now: Date,
): string | null {
  if (!until) return null;
  const seconds = Math.ceil((until.getTime() - now.getTime()) / 1000);
  return seconds > 0 ? String(seconds) : null;
}
