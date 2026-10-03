import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { type SummaryState, toAdminSummary } from "./summary";

/**
 * Resumen del admin (`public.admin_summary()`, de `20261003130000_admin_summary.sql`,
 * D154–D155) con la sesión del admin: contadores, avisos y pendientes en una lectura. Un
 * error de lectura no rompe la pantalla: vuelve `error` y la UI ofrece Reintentar.
 */
export const getAdminSummary = cache(async (): Promise<SummaryState> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_summary");
  if (error) {
    console.error(`admin_summary: ${error.message}`);
    return { status: "error" };
  }
  return { status: "ready", summary: toAdminSummary(data) };
});
