/**
 * Validación de los formularios de auth. Puro y portable. La regla de contraseña la **impone
 * Supabase** (Auth › Providers › Email: mínimo 8, minúscula, mayúscula, dígito y símbolo,
 * D075) y vive en el core (`supabase/functions/_shared/core/password.ts`, D107); aquí solo se
 * le ponen los textos para que el alumno no descubra los requisitos a base de rechazos (D003).
 * Copy provisional: requisitos y ayudas (CONTENT_CHECKLIST fila 42).
 */

import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE_TESTS,
  type PasswordRuleId,
} from "../../supabase/functions/_shared/core/password.ts";

export {
  failedPasswordRules,
  isValidPassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE_TESTS,
  PASSWORD_SYMBOLS,
  type PasswordRuleId,
} from "../../supabase/functions/_shared/core/password.ts";

/** Texto de cada regla del core. */
const PASSWORD_RULE_LABELS: Record<PasswordRuleId, string> = {
  length: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`,
  lower: "Una minúscula",
  upper: "Una mayúscula",
  digit: "Un número",
  symbol: "Un símbolo (por ejemplo ! # $ %)",
};

/** Las reglas del core, en su orden, con su texto de UI. */
export const PASSWORD_RULES: readonly {
  id: PasswordRuleId;
  label: string;
  test: (password: string) => boolean;
}[] = PASSWORD_RULE_TESTS.map(({ id, test }) => ({
  id,
  label: PASSWORD_RULE_LABELS[id],
  test,
}));

export function checkPassword(password: string) {
  const rules = PASSWORD_RULES.map(({ id, label, test }) => ({
    id,
    label,
    met: test(password),
  }));
  return { rules, valid: rules.every((r) => r.met) };
}

/** Forma mínima de un correo (algo@algo.algo, sin espacios). Supabase valida el resto. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export const EMAIL_EMPTY_ERROR = "Escribe tu correo.";
export const EMAIL_FORMAT_ERROR =
  "Revisa el correo: le falta la @ o el dominio.";

/**
 * Error de formato del correo mientras se escribe: null si está vacío (eso solo se avisa al
 * enviar) o si es válido. Lo muestra `useDeferredError` con retraso (D100).
 */
export function emailFormatError(value: string): string | null {
  return value.trim() && !isValidEmail(value) ? EMAIL_FORMAT_ERROR : null;
}

/** `profiles.display_name`: 1–80 caracteres (ver la migración de usuarios). */
export const NAME_MAX_LENGTH = 80;

export function isValidName(value: string): boolean {
  const name = value.trim();
  return name.length >= 1 && [...name].length <= NAME_MAX_LENGTH;
}
