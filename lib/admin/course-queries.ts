import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { type AdminCourseData, parseCourseData } from "./course";

/**
 * Lectura de `/admin/course` en el Server Component, con la sesión del admin: `admin_course`
 * trae curso, unidades, lecciones, pasos, posiciones y canciones del estilo en una llamada
 * (D168). Un error de lectura se lanza; la página lo muestra con Reintentar.
 */
export const getAdminCourse = cache(
  async (styleId: string): Promise<AdminCourseData | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_course", {
      p_style_id: styleId,
    });
    if (error) throw new Error(`admin_course: ${error.message}`);
    return parseCourseData(data);
  },
);
