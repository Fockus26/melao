import type { Metadata } from "next";
import Link from "next/link";
import { AUTH_LINK, AuthPanel } from "@/components/auth/auth-panel";
import { SignInForm } from "@/components/auth/sign-in-form";
import { CALLBACK_ERRORS, isCallbackErrorReason } from "@/lib/auth/errors";
import { AUTH_ROUTES, DEFAULT_AFTER_AUTH, safeNext } from "@/lib/auth/redirect";
import { firstParam } from "@/lib/search-params";

// Copy provisional: títulos y textos de auth (CONTENT_CHECKLIST fila 42).
export const metadata: Metadata = {
  title: "Entrar",
  description: "Entra a Melao con tu correo o con Google.",
};

export default async function EntrarPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const next = safeNext(firstParam(params.next));
  const reason = firstParam(params.error);
  const signUpHref =
    next === DEFAULT_AFTER_AUTH
      ? AUTH_ROUTES.signUp
      : `${AUTH_ROUTES.signUp}?next=${encodeURIComponent(next)}`;

  return (
    <AuthPanel
      title="Entrar"
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link href={signUpHref} className={AUTH_LINK}>
            Crea una
          </Link>
        </>
      }
    >
      <SignInForm
        next={next}
        initialError={
          isCallbackErrorReason(reason) ? CALLBACK_ERRORS[reason] : null
        }
      />
    </AuthPanel>
  );
}
