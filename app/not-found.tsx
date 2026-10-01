import type { Metadata } from "next";
import { statusCopy } from "@/components/status/copy";
import { NotFoundScreen } from "@/components/status/not-found-screen";
import { getSessionUser } from "@/lib/auth/session";

/**
 * 404 de todo el sitio (D109): rutas que no existen y cada `notFound()` (lección inexistente,
 * admin sin rol). Con sesión ofrece Inicio y el curso; sin sesión, la portada y Entrar.
 */
export const metadata: Metadata = {
  title: statusCopy.notFound.pageTitle,
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  // Sin configuración de Supabase la página igual tiene que pintarse: se trata como invitado.
  const user = await getSessionUser().catch(() => null);
  return <NotFoundScreen signedIn={user !== null} />;
}
