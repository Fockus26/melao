/**
 * Validación de los formularios de auth. Puro y portable. La regla de contraseña la **impone
 * Supabase** (Auth › Providers › Email: mínimo 8, letras y dígitos, D075); la UI solo la
 * refleja para que el alumno no descubra los requisitos a base de rechazos (D003).
 * Copy provisional: requisitos y ayudas (CONTENT_CHECKLIST fila 42).
 */

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRuleId = "length" | "letter" | "digit";

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
  // Como `letters_digits` de Supabase: letras y dígitos ASCII (una "ñ" sola no cuenta).
  { id: "letter", label: "Una letra", test: (p) => /[A-Za-z]/.test(p) },
  { id: "digit", label: "Un número", test: (p) => /[0-9]/.test(p) },
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

/** `profiles.display_name`: 1–80 caracteres (ver la migración de usuarios). */
export const NAME_MAX_LENGTH = 80;

export function isValidName(value: string): boolean {
  const name = value.trim();
  return name.length >= 1 && [...name].length <= NAME_MAX_LENGTH;
}
