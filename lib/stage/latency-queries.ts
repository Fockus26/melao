import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Última calibración web del alumno (ms), la que usa el escenario en lugar de la latencia del
 * navegador (D124); `null` si no calibró. La leen la sesión libre y la Lección (D145).
 */
export const getWebLatencyMs = cache(
  async (userId: string): Promise<number | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("audio_latency")
      .select("offset_ms")
      // El admin lee las de todos (RLS): solo las suyas.
      .eq("user_id", userId)
      .eq("platform", "web")
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`audio_latency: ${error.message}`);
    return data?.offset_ms ?? null;
  },
);
