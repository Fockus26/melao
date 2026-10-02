import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CatalogStep } from "./catalog";

/**
 * Pasos publicados del estilo (`public.step_catalog`, de `20261002120000_step_catalog.sql`,
 * D127): por categoría y orden del admin, con el estado, el favorito y el próximo repaso del
 * rol de `auth.uid()`. Un error de lectura se lanza.
 */
export const getStepCatalog = cache(
  async (styleId: string): Promise<CatalogStep[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("step_catalog", {
      p_style_id: styleId,
    });
    if (error) throw new Error(`step_catalog: ${error.message}`);
    // Los tipos generados no marcan columnas nulas en funciones: `due_at` falta sin tarjeta.
    return data.map((r) => ({
      id: r.step_id,
      slug: r.slug,
      name: r.name,
      category: r.category,
      difficulty: r.difficulty,
      status: r.status,
      favorite: r.favorite,
      dueAt: r.due_at ?? null,
    }));
  },
);
