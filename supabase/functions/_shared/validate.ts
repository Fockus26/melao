/**
 * Validación de entrada a mano (sin librería: funciona igual en Deno y en bun, D052).
 * Cada fallo es un 400 `invalid_input` con la ruta del campo en el mensaje.
 */

import { badRequest } from "./http.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function invalid(path: string, expected: string): never {
  throw badRequest("invalid_input", `${path}: se esperaba ${expected}.`);
}

export function object(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid(path, "un objeto");
  }
  return value as Record<string, unknown>;
}

export function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) invalid(path, "una lista");
  return value;
}

export function uuid(value: unknown, path: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    invalid(path, "un uuid");
  }
  return value.toLowerCase();
}

export function oneOf<T extends string>(
  value: unknown,
  options: readonly T[],
  path: string,
): T {
  if (typeof value !== "string" || !options.includes(value as T)) {
    invalid(path, options.join(" | "));
  }
  return value as T;
}

export function integer(
  value: unknown,
  min: number,
  max: number,
  path: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    invalid(path, `un entero de ${min} a ${max}`);
  }
  return value;
}

/** Fecha ISO 8601 con zona (p. ej. `2026-09-29T14:00:00Z`). */
export function isoDate(value: unknown, path: string): Date {
  const date = typeof value === "string" ? new Date(value) : null;
  if (
    !date ||
    Number.isNaN(date.getTime()) ||
    !/T.*(Z|[+-]\d{2}:\d{2})$/.test(value as string)
  ) {
    invalid(path, "una fecha ISO 8601 con zona");
  }
  return date;
}

/** Campo opcional: `undefined` y `null` valen lo mismo. */
export function optional<T>(
  value: unknown,
  parse: (value: unknown) => T,
): T | undefined {
  return value === undefined || value === null ? undefined : parse(value);
}
