/**
 * Bienvenida (`/welcome`): pasos, opciones y lectura de los errores de
 * `public.complete_onboarding`. Puro, sin React ni Next: se porta tal cual a Android/iOS
 * (docs/spec/pantallas.md, Bienvenida). La regla (estilos publicados, ≥ 1, rol y nivel) vive en
 * la base (D003); aquí solo se decide qué texto mostrar.
 */
import type { Database } from "@/supabase/functions/_shared/database.types";

export type DanceRole = Database["public"]["Enums"]["dance_role"];
export type ExperienceLevel = Database["public"]["Enums"]["experience_level"];

export const WELCOME_STEPS = 3;
export type WelcomeStep = 1 | 2 | 3;

/** Paso de `?step=` en la muestra; cualquier otra cosa es el 1. */
export function parseWelcomeStep(
  value: string | null | undefined,
): WelcomeStep {
  return value === "2" ? 2 : value === "3" ? 3 : 1;
}

// Copy provisional (CONTENT_CHECKLIST fila 46): descripciones de rol y nivel.
export const ROLE_OPTIONS: readonly {
  value: DanceRole;
  label: string;
  description: string;
}[] = [
  {
    value: "leader",
    label: "Líder",
    description: "Marcas los pasos y guías a tu pareja.",
  },
  {
    value: "follower",
    label: "Seguidor",
    description: "Lees la guía y respondes con tus giros.",
  },
];

export const LEVEL_OPTIONS: readonly {
  value: ExperienceLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "beginner",
    label: "Empiezo desde cero",
    description: "Vas directo a la lección 1 del curso.",
  },
  {
    value: "knows_steps",
    label: "Ya sé algunos pasos",
    description: "Márcalos en el catálogo y entran directo a tu repaso.",
  },
];

export type OnboardingFailure = "session" | "unavailable" | "generic";

/**
 * Qué salió mal al llamar a `complete_onboarding`, por su código de Postgres: `42501` = sin
 * sesión; `22023` con "estilo no disponible" = un estilo dejó de estar publicado. Lo demás
 * (red, perfil sin fila, validación que el cliente ya evita) es genérico.
 */
export function onboardingFailure(
  error: { code?: string; message?: string } | null | undefined,
): OnboardingFailure | null {
  if (!error) return null;
  if (error.code === "42501") return "session";
  if (error.code === "22023" && /no disponible/.test(error.message ?? ""))
    return "unavailable";
  return "generic";
}

// Copy provisional (CONTENT_CHECKLIST fila 45).
export const ONBOARDING_ERROR_COPY: Record<
  Exclude<OnboardingFailure, "session">,
  string
> = {
  unavailable:
    "Uno de los estilos que elegiste ya no está disponible. Vuelve al paso 1 y revisa tu elección.",
  generic:
    "No pudimos guardar tus respuestas. Revisa tu conexión e inténtalo de nuevo.",
};
