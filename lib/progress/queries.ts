import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  RECENT_SESSIONS_LIMIT,
  type RecentSession,
  type StepStatusCounts,
  toStatusCounts,
} from "./progress";

/**
 * Lecturas de Progreso para su Server Component, con la sesión del alumno. Las que llevan
 * reglas van por funciones SQL (`step_status_counts`; `review_forecast` la pide el navegador
 * con su zona horaria, `components/progress/review-forecast.tsx`). Las sesiones recientes son
 * una lectura directa: RLS deja al admin leer las de todos, así que se filtra por `user_id`
 * (regla de la tanda 15). Android/iOS hacen las mismas lecturas con el SDK.
 */

/** Pasos publicados del estilo por estado (`step_status_counts`, D131). */
export const getStepStatusCounts = cache(
  async (styleId: string): Promise<StepStatusCounts> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("step_status_counts", {
      p_style_id: styleId,
    });
    if (error) throw new Error(`step_status_counts: ${error.message}`);
    return toStatusCounts(data[0]);
  },
);

/** Las últimas sesiones propias, de todos los estilos, la más nueva primero (D132). */
export const getRecentSessions = cache(
  async (userId: string): Promise<RecentSession[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("practice_sessions")
      .select(
        "id, mode, created_at, style:dance_styles(name), song:songs(title), lesson:lessons(title)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(RECENT_SESSIONS_LIMIT);
    if (error) throw new Error(`practice_sessions: ${error.message}`);
    return data.map((s) => ({
      id: s.id,
      mode: s.mode,
      styleName: s.style?.name ?? null,
      songTitle: s.song?.title ?? null,
      lessonTitle: s.lesson?.title ?? null,
      createdAt: s.created_at,
    }));
  },
);
