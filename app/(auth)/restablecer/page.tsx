import type { Metadata } from "next";
import Link from "next/link";
import { AuthPanel } from "@/components/auth/auth-panel";
import { FormErrorBanner } from "@/components/auth/form-banner";
import { ResetForm } from "@/components/auth/reset-form";
import { Button } from "@/components/ui/button";
import { CALLBACK_ERRORS } from "@/lib/auth/errors";
import { AUTH_ROUTES } from "@/lib/auth/redirect";
import { getSessionUser } from "@/lib/auth/session";

// Copy provisional: títulos y textos de auth (CONTENT_CHECKLIST fila 42).
export const metadata: Metadata = {
  title: "Nueva contraseña · Melao",
  robots: { index: false, follow: false },
};

/**
 * Llega desde el enlace del correo, ya con la sesión de recuperación (la dejó
 * `/auth/callback`). Sin sesión, el enlace venció o no pasó por el callback: se ofrece pedir
 * otro en vez de un formulario que igual fallaría.
 */
export default async function RestablecerPage() {
  const user = await getSessionUser();
  return (
    <AuthPanel
      title="Crea una contraseña nueva"
      description={
        user?.email ? (
          <>
            Para la cuenta <strong className="text-text">{user.email}</strong>.
          </>
        ) : undefined
      }
    >
      {user ? (
        <ResetForm />
      ) : (
        <>
          <FormErrorBanner message={CALLBACK_ERRORS["enlace-vencido"]} />
          <Button asChild size="lg" className="w-full">
            <Link href={AUTH_ROUTES.forgot}>Pedir otro enlace</Link>
          </Button>
        </>
      )}
    </AuthPanel>
  );
}
