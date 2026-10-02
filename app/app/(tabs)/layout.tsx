import { AppShell } from "@/components/layout/app-shell";
import { ThemeSync } from "@/components/profile/theme-sync";
import { getOwnProfile, getSessionUser } from "@/lib/auth/session";

/**
 * Las pestañas de `/app/*` (Inicio, Curso, Practicar, Pasos, Perfil, Progreso) van con AppShell.
 * El grupo `(tabs)` no cambia la URL (D091, extiende D072): deja fuera, sin navegación, lo que
 * va a pantalla completa (`/app/lessons/[id]`). La sesión y la Bienvenida hecha las exige cada
 * página con `requireOnboardedUser` (un layout no se vuelve a evaluar al navegar) y, antes, el
 * proxy (solo la sesión). Aquí solo se alinea el tema del navegador con el del perfil (D136);
 * la lectura es la misma, memoizada, que hace cada página.
 */
export default async function AppTabsLayout({ children }: LayoutProps<"/app">) {
  const user = await getSessionUser();
  const profile = user ? await getOwnProfile(user.id) : null;
  return (
    <AppShell>
      {profile ? <ThemeSync theme={profile.theme} /> : null}
      {children}
    </AppShell>
  );
}
