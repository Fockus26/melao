/**
 * Regla de contraseña (D075), pura y portable: mínimo 8 caracteres con al menos una minúscula,
 * una mayúscula y un dígito ASCII y un símbolo de la lista de Supabase
 * (`lower_upper_letters_digits_symbols` de GoTrue). La impone Supabase Auth; la Edge Function
 * `change-password` la repite antes de tocar el historial (D107) y la UI la refleja
 * (`lib/auth/validation.ts`). Vectores: `docs/spec/vectors/password-*.json`.
 */

export const PASSWORD_MIN_LENGTH = 8;

/** Símbolos que acepta Supabase (GoTrue). */
export const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

export type PasswordRuleId = "length" | "lower" | "upper" | "digit" | "symbol";

/** Reglas en el orden en que las muestra la UI. */
export const PASSWORD_RULE_TESTS: readonly {
  id: PasswordRuleId;
  test: (password: string) => boolean;
}[] = [
  // Longitud en puntos de código (un emoji cuenta 1), como GoTrue.
  { id: "length", test: (p) => [...p].length >= PASSWORD_MIN_LENGTH },
  { id: "lower", test: (p) => /[a-z]/.test(p) },
  { id: "upper", test: (p) => /[A-Z]/.test(p) },
  { id: "digit", test: (p) => /[0-9]/.test(p) },
  {
    id: "symbol",
    test: (p) => [...p].some((c) => PASSWORD_SYMBOLS.includes(c)),
  },
];

/** Reglas que la contraseña no cumple (vacío = válida). */
export function failedPasswordRules(password: string): PasswordRuleId[] {
  return PASSWORD_RULE_TESTS.filter((r) => !r.test(password)).map((r) => r.id);
}

export function isValidPassword(password: string): boolean {
  return failedPasswordRules(password).length === 0;
}
