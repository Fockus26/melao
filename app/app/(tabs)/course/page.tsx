import type { Metadata } from "next";
import { CourseView } from "@/components/app/course-view";
import { getOwnProfile, requireOnboardedUser } from "@/lib/auth/session";
import { pickCurrentStyle } from "@/lib/course/path";
import {
  getCoursePath,
  getDueSteps,
  getStyleOptions,
  hasActiveSubscription,
} from "@/lib/course/queries";

export const metadata: Metadata = {
  title: "Curso",
  robots: { index: false, follow: false },
};

/**
 * Curso (App-Curso). Exige sesión y Bienvenida hecha (D081). Mismo estilo actual que Inicio
 * (`pickCurrentStyle`). El camino y sus estados salen de `course_path` (D092); el nodo de
 * repaso, de `due_steps`. Sin suscripción el camino se ve y repasar lleva a Planes (D036).
 */
export default async function CoursePage() {
  const user = await requireOnboardedUser("/app/course");
  const [profile, styles, subscribed] = await Promise.all([
    getOwnProfile(user.id),
    getStyleOptions(),
    hasActiveSubscription(),
  ]);
  const style = pickCurrentStyle(styles, profile?.default_style_id);
  const [path, due] = style
    ? await Promise.all([getCoursePath(style.id), getDueSteps(style.id)])
    : [null, []];

  return (
    <CourseView
      styles={styles}
      currentStyle={style}
      role={profile?.dance_role ?? null}
      userId={user.id}
      subscribed={subscribed}
      path={path}
      due={due}
    />
  );
}
