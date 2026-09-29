import type { Metadata } from "next";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Panel · Admin",
  robots: { index: false, follow: false },
};

/**
 * Panel **provisional** (CONTENT_CHECKLIST fila 43): prueba que `/admin` exige sesión y rol
 * admin. El panel real llega con las pantallas de admin.
 */
export default async function AdminHomePage() {
  const user = await requireAdmin("/admin");
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="type-eyebrow text-text-secondary">Panel · próximamente</p>
        <h1 className="type-h1">Administración</h1>
        <p className="type-body text-text-secondary">
          Entraste como admin{user.email ? ` (${user.email})` : ""}. Aquí vas a
          gestionar pasos, canciones, el curso y los alumnos.
        </p>
      </header>
      <SignOutButton />
    </div>
  );
}
