/**
 * Validación de los formularios de auth. Puro y portable. La regla de contraseña la **impone
 * Supabase** (Auth › Providers › Email: mínimo 8, minúscula, mayúscula, dígito y símbolo,
 * D075); la UI solo la refleja para que el alumno no descubra los requisitos a base de
 * rechazos (D003).
 * Copy provisional: requisitos y ayudas (CONTENT_CHECKLIST fila 42).
 */

export const PASSWORD_MIN_LENGTH = 8;

/** Símbolos que acepta `lower_upper_letters_digits_symbols` de Supabase (GoTrue). */
export const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

export type PasswordRuleId = "length" | "lower" | "upper" | "digit" | "symbol";

export const PASSWORD_RULES: readonly {
  id: PasswordRuleId;
  label: string;
  test: (password: string) => boolean;
}[] = [
  {
    id: "length",
    label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    test: (p) => [...p].length >= PASSWORD_MIN_LENGTH,
  },
  // Como Supabase: letras y dígitos ASCII (una "ñ" sola no cuenta).
  { id: "lower", label: "Una minúscula", test: (p) => /[a-z]/.test(p) },
  { id: "upper", label: "Una mayúscula", test: (p) => /[A-Z]/.test(p) },
  { id: "digit", label: "Un número", test: (p) => /[0-9]/.test(p) },
  {
    id: "symbol",
    label: "Un símbolo (por ejemplo ! # $ %)",
    test: (p) => [...p].some((c) => PASSWORD_SYMBOLS.includes(c)),
  },
];

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
