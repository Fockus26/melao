import type { Metadata } from "next";
import { ProgressView } from "@/components/progress/progress-view";
import { LiveReviewForecast } from "@/components/progress/review-forecast";
import { getOwnProfile, requireOnboardedUser } from "@/lib/auth/session";
import { pickCurrentStyle, summarizeCourse } from "@/lib/course/path";
import {
  getCoursePath,
  getHardestSteps,
  getStyleOptions,
} from "@/lib/course/queries";
import {
  HARDEST_LIMIT,
  PROGRESS_LINKS,
  pickProgressStyle,
} from "@/lib/progress/progress";
import { getRecentSessions, getStepStatusCounts } from "@/lib/progress/queries";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Progreso",
  robots: { index: false, follow: false },
};

/**
 * Progreso (App-Progreso). Exige sesión y Bienvenida hecha (D081). Estilo: `?style=` o el
 * actual de Inicio y Curso (`pickCurrentStyle`). Lecciones (`style_progress` + `course_path`),
 * pasos por estado (`step_status_counts`), lo que más cuesta (`hardest_steps`) y las sesiones
 * propias; los próximos repasos los pide el navegador con su zona (`review_forecast`, D130).
 * Sin suscripción se ve igual (D036): practicar lo decide el configurador.
 */
export default async function ProgressPage(props: PageProps<"/app/progress">) {
  const requested = firstParam((await props.searchParams).style);
  const user = await requireOnboardedUser(PROGRESS_LINKS.progress(requested));
  const [profile, styles, sessions] = await Promise.all([
    getOwnProfile(user.id),
    getStyleOptions(),
    getRecentSessions(user.id),
  ]);
  const style = pickProgressStyle(
    styles,
    requested,
    pickCurrentStyle(styles, profile?.default_style_id),
  );
  const [path, counts, hardest] = style
    ? await Promise.all([
        getCoursePath(style.id),
        getStepStatusCounts(style.id),
        getHardestSteps(style.id, HARDEST_LIMIT),
      ])
    : [null, { unknown: 0, learning: 0, known: 0, total: 0 }, []];

  return (
    <ProgressView
      styles={styles}
      style={style}
      course={path ? summarizeCourse(path) : null}
      counts={counts}
      hardest={hardest}
      sessions={sessions}
      now={new Date()}
      forecast={style ? <LiveReviewForecast styleId={style.id} /> : null}
    />
  );
}
