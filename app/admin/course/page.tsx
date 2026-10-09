import type { Metadata } from "next";
import { CourseAdminView } from "@/components/admin/course/course-admin-view";
import type { AdminCourseData } from "@/lib/admin/course";
import { getAdminCourse } from "@/lib/admin/course-queries";
import { getAdminStyles } from "@/lib/admin/steps-queries";
import { requireAdmin } from "@/lib/auth/session";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Camino · Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin · Camino: el Constructor del camino (D168–D173). Exige rol admin (también aquí: el
 * layout no se vuelve a evaluar al navegar, D073). Estilo = `?style=<slug>` si existe; si no, el
 * primero por `sort_order`, publicado o no. `admin_course` trae todo en una lectura; la lección
 * abierta (`?lesson=<uuid>`) la elige el cliente sobre esos datos.
 */
export default async function AdminCoursePage(
  props: PageProps<"/admin/course">,
) {
  const params = await props.searchParams;
  await requireAdmin("/admin/course");

  let loadError = false;
  const styles = await getAdminStyles().catch((error) => {
    console.error(error);
    loadError = true;
    return [];
  });
  const requested = firstParam(params.style);
  const style = styles.find((s) => s.slug === requested) ?? styles[0] ?? null;

  let data: AdminCourseData | null = null;
  if (style) {
    try {
      data = await getAdminCourse(style.id);
    } catch (error) {
      console.error(error);
      loadError = true;
    }
  }

  return (
    <CourseAdminView
      // Cambiar de estilo monta la vista de nuevo.
      key={style?.id ?? "none"}
      styles={styles}
      currentStyle={style}
      data={data}
      loadError={loadError}
    />
  );
}
