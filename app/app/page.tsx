import type { Metadata } from "next";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getOwnProfile, requireOnboardedUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Inicio · Melao",
  robots: { index: false, follow: false },
};

/**
 * Inicio **provisional** (CONTENT_CHECKLIST fila 43): solo confirma la sesión y deja cerrar
 * sesión, hasta que llegue la pantalla de Inicio de 07b.
 */
export default async function AppHomePage() {
  const user = await requireOnboardedUser("/app");
  const profile = await getOwnProfile(user.id);
  const name = profile?.display_name;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="type-eyebrow text-text-secondary">
          Inicio · próximamente
        </p>
        <h1 className="type-display">{name ? `Hola, ${name}` : "Hola"}</h1>
        <p className="type-body text-text-secondary">
          Ya tienes tu cuenta. Aquí vas a ver tus repasos del día, la lección
          que sigue y tus prácticas.
        </p>
      </header>
      {user.email ? (
        <p className="type-small text-text-secondary">
          Sesión iniciada como{" "}
          <strong className="font-medium text-text">{user.email}</strong>
        </p>
      ) : null}
      <SignOutButton />
    </div>
  );
}
