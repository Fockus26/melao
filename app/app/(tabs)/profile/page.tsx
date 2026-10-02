import type { Metadata } from "next";
import { ProfileView } from "@/components/profile/profile-view";
import { isEmailChangeResult, PROFILE_PATH } from "@/lib/auth/redirect";
import { requireOnboardedUser } from "@/lib/auth/session";
import { pickCurrentStyle } from "@/lib/course/path";
import { getStyleOptions } from "@/lib/course/queries";
import {
  getAccountEmail,
  getLatestLatency,
  getMySubscription,
  getProfileSettings,
} from "@/lib/profile/queries";
import { firstParam } from "@/lib/search-params";
import { isThemePreference } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Perfil",
  robots: { index: false, follow: false },
};

/**
 * Perfil (App-Perfil). Exige sesión y Bienvenida hecha (D081); el admin tiene perfil y lo ve
 * igual. Las preferencias se leen de `profiles` (su fila), el correo de Auth (con el pendiente
 * de un cambio), la latencia de `audio_latency` (D124) y la suscripción de `my_subscription()`
 * (D135). `?email=` trae el resultado del enlace de cambio de correo (D134).
 */
export default async function ProfilePage(props: PageProps<"/app/profile">) {
  const user = await requireOnboardedUser(PROFILE_PATH);
  const [params, profile, account, styles, latency, subscription] =
    await Promise.all([
      props.searchParams,
      getProfileSettings(user.id),
      getAccountEmail(),
      getStyleOptions(),
      getLatestLatency(user.id),
      getMySubscription(),
    ]);
  const notice = firstParam(params.email);

  return (
    <ProfileView
      account={{
        name: profile?.display_name ?? null,
        email: account.email ?? user.email,
        pendingEmail: account.pendingEmail,
      }}
      role={profile?.dance_role ?? null}
      styles={styles}
      currentStyle={pickCurrentStyle(styles, profile?.default_style_id)}
      coach={{
        volume: profile?.coach_voice_volume ?? 80,
        spokenCount: profile?.coach_spoken_count ?? true,
      }}
      latency={latency}
      theme={isThemePreference(profile?.theme) ? profile.theme : "system"}
      subscription={subscription}
      notice={isEmailChangeResult(notice) ? notice : null}
      userId={user.id}
    />
  );
}
