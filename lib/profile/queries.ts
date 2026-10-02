import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  type ProfileLatency,
  type ProfileSubscription,
  toProfileSubscription,
} from "./profile";

/**
 * Lecturas de Perfil (Server Components), con la sesión del alumno. El admin lee las filas de
 * todos por RLS: cada lectura filtra por su `id` (o la función SQL por `auth.uid()`).
 */

/** Preferencias del perfil propio. `null` si aún no existe. */
export const getProfileSettings = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "display_name, dance_role, default_style_id, theme, coach_voice_volume, coach_spoken_count",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`profiles: ${error.message}`);
  return data;
});

/**
 * Correo actual y el pendiente de confirmar (`new_email`). Va a Auth (`getUser`) y no a las
 * claims del JWT, que conservan el correo anterior hasta renovar la sesión.
 */
export const getAccountEmail = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return {
    email: data.user?.email ?? null,
    pendingEmail: data.user?.new_email ?? null,
  };
});

/** Última calibración web (la misma que usa la sesión, D124). */
export const getLatestLatency = cache(
  async (userId: string): Promise<ProfileLatency> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("audio_latency")
      .select("offset_ms, measured_at")
      .eq("user_id", userId)
      .eq("platform", "web")
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`audio_latency: ${error.message}`);
    return data
      ? { offsetMs: data.offset_ms, measuredAt: data.measured_at }
      : null;
  },
);

/** Suscripción a mostrar (`my_subscription()`, D135); `null` si nunca tuvo. */
export const getMySubscription = cache(
  async (): Promise<ProfileSubscription | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("my_subscription");
    if (error) throw new Error(`my_subscription: ${error.message}`);
    return toProfileSubscription(data[0]);
  },
);
