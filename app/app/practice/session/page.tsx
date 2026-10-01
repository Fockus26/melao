import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { stageCopy } from "@/components/stage/copy";
import { PracticeSession } from "@/components/stage/practice-session";
import { requireOnboardedUser } from "@/lib/auth/session";
import { firstParam } from "@/lib/search-params";
import { SESSION_LINKS } from "@/lib/stage/practice-session";
import { getPracticeSession } from "@/lib/stage/session-queries";

export const metadata: Metadata = {
  title: stageCopy.title,
  robots: { index: false, follow: false },
};

/**
 * Sesión de práctica (`/app/practice/session?id=<sessionId>`, handoff § Sesión): la crea
 * `plan-session` desde el configurador; aquí solo se lee (propia: `user_id = auth.uid()`) y se
 * recalcula la línea de tiempo con el core. Recargar no crea otra sesión. Inexistente o ajena →
 * 404. Pantalla completa sin navegación, en escenario en ambos temas.
 */
export default async function PracticeSessionPage(
  props: PageProps<"/app/practice/session">,
) {
  const id = firstParam((await props.searchParams).id) ?? "";
  const user = await requireOnboardedUser(SESSION_LINKS.session(id));
  const data = await getPracticeSession(id, user.id);
  if (!data) notFound();
  return (
    <PracticeSession
      key={data.sessionId}
      data={data}
      exitHref={SESSION_LINKS.practice}
      resultHref={SESSION_LINKS.result(data.sessionId)}
    />
  );
}
