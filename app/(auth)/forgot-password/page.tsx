import type { Metadata } from "next";
import Link from "next/link";
import { AUTH_LINK, AuthPanel } from "@/components/auth/auth-panel";
import { ForgotForm } from "@/components/auth/forgot-form";
import { CALLBACK_ERRORS, isCallbackErrorReason } from "@/lib/auth/errors";
import { AUTH_ROUTES } from "@/lib/auth/redirect";
import { firstParam } from "@/lib/search-params";

// Copy provisional: títulos y textos de auth (CONTENT_CHECKLIST fila 42).
export const metadata: Metadata = {
  title: "Recupera tu contraseña · Melao",
  robots: { index: false, follow: false },
};

export default async function RecuperarPage(
  props: PageProps<"/forgot-password">,
) {
  const reason = firstParam((await props.searchParams).error);
  return (
    <AuthPanel
      title="Recupera tu contraseña"
      description="Escribe el correo de tu cuenta y te enviamos un enlace para crear una contraseña nueva."
      footer={
        <>
          ¿La recordaste?{" "}
          <Link href={AUTH_ROUTES.signIn} className={AUTH_LINK}>
            Entra
          </Link>
        </>
      }
    >
      <ForgotForm
        initialError={
          isCallbackErrorReason(reason) ? CALLBACK_ERRORS[reason] : null
        }
      />
    </AuthPanel>
  );
}
