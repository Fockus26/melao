import type { Metadata } from "next";
import Link from "next/link";
import { AUTH_LINK, AuthPanel } from "@/components/auth/auth-panel";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { AUTH_ROUTES, DEFAULT_AFTER_AUTH, safeNext } from "@/lib/auth/redirect";
import { firstParam } from "@/lib/search-params";

// Copy provisional: títulos y textos de auth (CONTENT_CHECKLIST fila 42).
export const metadata: Metadata = {
  title: "Crea tu cuenta",
  description:
    "Crea tu cuenta de Melao con tu correo o con Google y empieza a practicar en casa.",
};

export default async function RegistroPage(props: PageProps<"/register">) {
  const params = await props.searchParams;
  const next = safeNext(firstParam(params.next));
  const signInHref =
    next === DEFAULT_AFTER_AUTH
      ? AUTH_ROUTES.signIn
      : `${AUTH_ROUTES.signIn}?next=${encodeURIComponent(next)}`;

  return (
    <AuthPanel
      title="Crea tu cuenta"
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href={signInHref} className={AUTH_LINK}>
            Entra
          </Link>
        </>
      }
    >
      <SignUpForm next={next} />
    </AuthPanel>
  );
}
