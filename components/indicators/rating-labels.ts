import type { SrsRating } from "@/supabase/functions/_shared/core/srs";

/**
 * Calificaciones y sus etiquetas, fuera del módulo cliente de RatingButtons para que también
 * las lean los Server Components (p. ej. "Última vez: Difícil" en Inicio).
 */

/** Orden fijo del handoff; el valor es la calificación FSRS (srs.md: 1 Again … 4 Easy). */
export const RATINGS = [1, 2, 3, 4] as const satisfies readonly SrsRating[];

/** Etiquetas del handoff (provisionales, CONTENT_CHECKLIST fila 36). */
export const RATING_LABELS: Record<SrsRating, string> = {
  1: "Muy difícil",
  2: "Difícil",
  3: "Bien",
  4: "Fácil",
};
