/**
 * Traduce los errores de regla de las funciones SQL `ef_*` (migración
 * `20260929120000_edge_functions.sql`: `raise exception '<código>'`) a `HttpError`.
 * Cualquier otro error de base de datos es un 500.
 */

import { HttpError, type HttpStatus } from "./http.ts";

const RULES: Record<string, { status: HttpStatus; message: string }> = {
  no_active_subscription: {
    status: 403,
    message: "Necesitas una suscripción activa.",
  },
  plan_not_found: { status: 404, message: "Ese plan no existe." },
  user_not_found: { status: 404, message: "No encontramos tu perfil." },
  session_not_found: { status: 404, message: "No encontramos esa sesión." },
  lesson_not_found: { status: 404, message: "No encontramos esa lección." },
  step_not_found: { status: 404, message: "Algún paso no existe." },
  subscription_exists: {
    status: 409,
    message: "Ya tienes una suscripción activa de otro plan.",
  },
  session_lesson_mismatch: {
    status: 400,
    message: "La sesión no es de esa lección.",
  },
  invalid_role: {
    status: 400,
    message: "Ese estilo no tiene roles: usa leader.",
  },
};

/** Error de supabase-js/PostgREST (`{ code, message }`). */
export interface DbError {
  code?: string;
  message: string;
}

export function fromDbError(error: DbError): Error {
  const rule = error.code === "P0001" ? RULES[error.message] : undefined;
  if (rule) return new HttpError(rule.status, error.message, rule.message);
  return new Error(`base de datos: ${error.code ?? "?"} ${error.message}`);
}
