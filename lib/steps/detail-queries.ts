import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseStepDetail, type StepDetail } from "./detail";

/**
 * Un paso publicado por slug (`public.step_detail`, de `20261002160000_step_detail.sql`, D138):
 * contenido, videos, posiciones, relacionados y lo del alumno (estado, favorito, tarjeta del
 * rol, historial). `styleId` = el estilo preferido si el slug se repite. `null` si no hay paso
 * publicado con ese slug (404). Un error de lectura se lanza.
 */
export const getStepDetail = cache(
  async (styleId: string, slug: string): Promise<StepDetail | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("step_detail", {
      p_style_id: styleId,
      p_slug: slug,
    });
    if (error) throw new Error(`step_detail: ${error.message}`);
    const row = data[0];
    // Los tipos generados no marcan columnas nulas en funciones (`description`, `role`, `due_at`).
    return row ? parseStepDetail(row) : null;
  },
);
