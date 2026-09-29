import { describe, expect, test } from "bun:test";
import {
  LEVEL_OPTIONS,
  onboardingFailure,
  parseWelcomeStep,
  ROLE_OPTIONS,
} from "@/lib/onboarding";
import { Constants } from "@/supabase/functions/_shared/database.types";

describe("Bienvenida", () => {
  test("las opciones cubren los enums de la base, en su orden", () => {
    expect(ROLE_OPTIONS.map((o) => o.value)).toEqual([
      ...Constants.public.Enums.dance_role,
    ]);
    expect(LEVEL_OPTIONS.map((o) => o.value)).toEqual([
      ...Constants.public.Enums.experience_level,
    ]);
  });

  test("errores de complete_onboarding", () => {
    expect(onboardingFailure(null)).toBeNull();
    expect(onboardingFailure({ code: "42501", message: "x" })).toBe("session");
    expect(
      onboardingFailure({ code: "22023", message: "estilo no disponible" }),
    ).toBe("unavailable");
    expect(
      onboardingFailure({ code: "22023", message: "elige al menos un estilo" }),
    ).toBe("generic");
    expect(onboardingFailure({ message: "Failed to fetch" })).toBe("generic");
  });

  test("paso de la muestra", () => {
    expect(parseWelcomeStep("2")).toBe(2);
    expect(parseWelcomeStep("3")).toBe(3);
    expect(parseWelcomeStep("4")).toBe(1);
    expect(parseWelcomeStep(undefined)).toBe(1);
  });
});
