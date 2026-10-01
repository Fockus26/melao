import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES, DEFAULT_AFTER_AUTH } from "@/lib/auth/redirect";
import { statusCopy } from "./copy";
import { CountRow } from "./count-row";
import { StatusScreen } from "./status-screen";

const COURSE_PATH = "/app/course";

/**
 * 404 (D109): con sesión, "Ir al inicio" lleva a Inicio de la app y la segunda acción al curso;
 * sin sesión, a la portada y a Entrar. A dos columnas desde 1024 px.
 */
export function NotFoundScreen({ signedIn }: { signedIn: boolean }) {
  const copy = statusCopy.notFound;
  const home = signedIn ? DEFAULT_AFTER_AUTH : "/";
  const second = signedIn
    ? { href: COURSE_PATH, label: copy.myCourse }
    : { href: AUTH_ROUTES.signIn, label: copy.signIn };
  return (
    <StatusScreen
      split
      logoHref={home}
      illustration={<CountRow variant="steady" split />}
      eyebrow={copy.eyebrow}
      title={copy.title}
      text={copy.text}
      actions={
        <>
          <Button asChild size="lg">
            <Link href={home}>{statusCopy.goHome}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={second.href}>{second.label}</Link>
          </Button>
        </>
      }
    />
  );
}
