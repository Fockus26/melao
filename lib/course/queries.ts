import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { SrsRating } from "@/supabase/functions/_shared/core/srs";
import {
  type CoursePath,
  type DueStep,
  type HardStep,
  type StyleOption,
  toLessonStatus,
} from "./path";

/**
 * Lecturas del curso para Server Components (Inicio, Curso, Lección). Llaman a las funciones
 * SQL de `20260930120000_course_path.sql` con la sesión del alumno: el alumno sale de
 * `auth.uid()` y RLS decide lo visible. Un error de lectura se lanza (pantalla de error).
 */

/** Estilos publicados con el avance del alumno, en orden de catálogo (`style_progress`). */
export const getStyleOptions = cache(async (): Promise<StyleOption[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("style_progress");
  if (error) throw new Error(`style_progress: ${error.message}`);
  return data.map((r) => ({
    id: r.style_id,
    name: r.name,
    hasRoles: r.has_roles,
    chosen: r.chosen,
    hasCourse: r.has_course,
    lessonCount: r.lesson_count,
    completedCount: r.completed_count,
  }));
});

/** Camino del curso publicado de un estilo (`course_path`); `null` si el estilo no tiene. */
export const getCoursePath = cache(
  async (styleId: string): Promise<CoursePath | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("course_path", {
      p_style_id: styleId,
    });
    if (error) throw new Error(`course_path: ${error.message}`);
    if (data.length === 0) return null;
    return {
      courseId: data[0].course_id,
      lessonCount: data[0].lesson_count,
      lessons: data.map((r) => ({
        unitId: r.unit_id,
        unitPosition: r.unit_position,
        unitTitle: r.unit_title,
        lessonId: r.lesson_id,
        lessonPosition: r.lesson_position,
        number: r.lesson_number,
        title: r.lesson_title,
        stepCount: r.step_count,
        status: toLessonStatus(r.status),
      })),
    };
  },
);

/** Pasos por repasar hoy en un estilo, los más atrasados primero (`due_steps`). */
export const getDueSteps = cache(
  async (styleId: string): Promise<DueStep[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("due_steps", {
      p_style_id: styleId,
    });
    if (error) throw new Error(`due_steps: ${error.message}`);
    return data.map((r) => ({ id: r.step_id, slug: r.slug, name: r.name }));
  },
);

/** Lo que más le cuesta al alumno en un estilo (`hardest_steps`, D093). */
export const getHardestSteps = cache(
  async (styleId: string, limit = 3): Promise<HardStep[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("hardest_steps", {
      p_style_id: styleId,
      p_limit: limit,
    });
    if (error) throw new Error(`hardest_steps: ${error.message}`);
    return data.map((r) => ({
      id: r.step_id,
      slug: r.slug,
      name: r.name,
      difficulty: r.difficulty,
      lastRating: r.last_rating as SrsRating,
      lastReviewedAt: r.last_reviewed_at,
    }));
  },
);

/** ¿Suscripción activa? La práctica y el repaso la exigen (D036); la vitrina, no. */
export const hasActiveSubscription = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_active_subscription");
  if (error) throw new Error(`has_active_subscription: ${error.message}`);
  return data === true;
});
