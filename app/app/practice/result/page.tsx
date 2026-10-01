import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resultCopy } from "@/components/practice-result/copy";
import { PracticeResult } from "@/components/practice-result/practice-result";
import { getOwnProfile, requireOnboardedUser } from "@/lib/auth/session";
import { getPracticeResult } from "@/lib/practice-result/queries";
import { RESULT_LINKS } from "@/lib/practice-result/result";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = {
  title: resultCopy.title,
  robots: { index: false, follow: false },
};

/**
 * Resultado de la práctica (`/app/practice/result?id=<sessionId>`, handoff § Práctica ·
 * resultado): a él lleva "Terminar" de la sesión. Lee la sesión propia (`user_id = auth.uid()`,
 * solo libres); inexistente, ajena o de una lección → 404. Ya calificada → se muestra lo
 * guardado (D126). Pantalla completa sin navegación, como la sesión y la lección.
 */
export default async function PracticeResultPage(
  props: PageProps<"/app/practice/result">,
) {
  const id = firstParam((await props.searchParams).id) ?? "";
  const user = await requireOnboardedUser(RESULT_LINKS.result(id));
  const profile = await getOwnProfile(user.id);
  const data = await getPracticeResult(
    id,
    user.id,
    profile?.dance_role ?? null,
  );
  if (!data) notFound();
  return <PracticeResult key={data.sessionId} data={data} />;
}
