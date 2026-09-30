import type { Metadata } from "next";
import { HomeView } from "@/components/app/home-view";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getOwnProfile, requireOnboardedUser } from "@/lib/auth/session";
import { pickCurrentStyle, summarizeCourse } from "@/lib/course/path";
import {
  getCoursePath,
  getDueSteps,
  getHardestSteps,
  getStyleOptions,
  hasActiveSubscription,
} from "@/lib/course/queries";

export const metadata: Metadata = {
  title: "Inicio",
  robots: { index: false, follow: false },
};

/**
 * Inicio (App-Inicio). Exige sesión y Bienvenida hecha (D081). Estilo actual =
 * `profiles.default_style_id` (o el primero elegido). Todo lo que tiene reglas (lección actual,
 * vencidos, lo que más cuesta) sale de las funciones SQL de `20260930120000_course_path.sql`.
 */
export default async function AppHomePage() {
  const user = await requireOnboardedUser("/app");
  const [profile, styles, subscribed] = await Promise.all([
    getOwnProfile(user.id),
    getStyleOptions(),
    hasActiveSubscription(),
  ]);
  const style = pickCurrentStyle(styles, profile?.default_style_id);
  const [path, due, hardest] = style
    ? await Promise.all([
        getCoursePath(style.id),
        getDueSteps(style.id),
        getHardestSteps(style.id),
      ])
    : [null, [], []];

  return (
    <HomeView
      name={profile?.display_name ?? null}
      now={new Date()}
      styles={styles}
      currentStyle={style}
      role={profile?.dance_role ?? null}
      userId={user.id}
      subscribed={subscribed}
      course={path ? summarizeCourse(path) : null}
      due={due}
      hardest={hardest}
      // Cerrar sesión vive aquí hasta que exista Perfil (pantallas.md).
      footer={
        <div className="flex flex-col items-start gap-3 border-t border-divider pt-6">
          {user.email ? (
            <p className="type-small text-text-secondary">
              Sesión iniciada como{" "}
              <strong className="font-medium text-text">{user.email}</strong>
            </p>
          ) : null}
          <SignOutButton />
        </div>
      }
    />
  );
}
