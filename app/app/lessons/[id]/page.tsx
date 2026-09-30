import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonFlow } from "@/components/lesson/lesson-flow";
import { LessonLocked } from "@/components/lesson/lesson-locked";
import { getOwnProfile, requireOnboardedUser } from "@/lib/auth/session";
import { LESSON_LINKS } from "@/lib/lesson/lesson";
import { getLessonPage } from "@/lib/lesson/queries";

/**
 * Lección (`/app/lessons/[id]`, handoff § Lección): fuera del grupo `(tabs)`, a pantalla completa
 * y sin navegación (D091). Exige sesión y Bienvenida hecha. Inexistente o no visible → 404;
 * bloqueada según `course_path` → pantalla de bloqueo (D098). El flujo de 6 etapas es cliente.
 */

async function load(props: PageProps<"/app/lessons/[id]">) {
  const { id } = await props.params;
  const user = await requireOnboardedUser(LESSON_LINKS.lesson(id));
  const profile = await getOwnProfile(user.id);
  return getLessonPage(id, user.id, profile?.dance_role ?? null);
}

export async function generateMetadata(
  props: PageProps<"/app/lessons/[id]">,
): Promise<Metadata> {
  const page = await load(props);
  return {
    title: page?.lesson.title ?? "Lección",
    robots: { index: false, follow: false },
  };
}

export default async function LessonPage(
  props: PageProps<"/app/lessons/[id]">,
) {
  const page = await load(props);
  if (!page) notFound();
  if (page.kind === "locked") {
    return (
      <LessonLocked
        title={page.lesson.title}
        number={page.lesson.number}
        courseHref={LESSON_LINKS.course}
      />
    );
  }
  return <LessonFlow key={page.lesson.id} lesson={page.lesson} />;
}
