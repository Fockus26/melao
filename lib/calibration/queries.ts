import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { SavedLatency } from "./calibration";

/**
 * Ajustes web guardados de quien llama, del más reciente al más viejo (el primero es el que
 * usa la sesión, D124). Lectura directa: RLS deja ver solo los propios; el filtro por
 * `user_id` lo deja explícito. Android/iOS leen igual con su `platform`.
 */
export const getSavedLatencies = cache(
  async (userId: string): Promise<SavedLatency[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("audio_latency")
      .select("device_key, device_label, offset_ms, measured_at")
      .eq("user_id", userId)
      .eq("platform", "web")
      .order("measured_at", { ascending: false });
    if (error) throw new Error(`audio_latency: ${error.message}`);
    return (data ?? []).map((row) => ({
      deviceKey: row.device_key,
      label: row.device_label ?? row.device_key,
      offsetMs: row.offset_ms,
      measuredAt: row.measured_at,
    }));
  },
);
