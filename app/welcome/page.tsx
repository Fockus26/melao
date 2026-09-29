import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WelcomeFlow } from "@/components/onboarding/welcome-flow";
import {
  DEFAULT_AFTER_AUTH,
  needsOnboarding,
  WELCOME_PATH,
} from "@/lib/auth/redirect";
import { getOwnProfile, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// Copy provisional (CONTENT_CHECKLIST fila 45).
export const metadata: Metadata = {
  title: "Bienvenida",
  description: "Elige qué bailas, tu rol y desde dónde empiezas.",
  robots: { index: false, follow: false },
};

/**
 * Bienvenida (P-Bienvenida). Exige sesión; con el onboarding hecho, a Inicio (D081). Estilos:
 * los publicados, en su orden (D082). Preselecciona lo que ya tenga el perfil.
 */
export default async function WelcomePage() {
  const user = await requireUser(WELCOME_PATH);
  const profile = await getOwnProfile(user.id);
  if (!needsOnboarding(profile)) redirect(DEFAULT_AFTER_AUTH);

  const supabase = await createClient();
  const [styles, chosen, level] = await Promise.all([
    // `published` explícito: un admin ve también los borradores por RLS.
    supabase
      .from("dance_styles")
      .select("id, name")
      .eq("published", true)
      .order("sort_order")
      .order("name"),
    supabase.from("user_styles").select("style_id").eq("user_id", user.id),
    supabase
      .from("profiles")
      .select("experience_level")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  return (
    <WelcomeFlow
      styles={styles.data ?? []}
      initial={{
        styleIds: chosen.data?.map((r) => r.style_id),
        danceRole: profile?.dance_role,
        level: level.data?.experience_level,
      }}
    />
  );
}
