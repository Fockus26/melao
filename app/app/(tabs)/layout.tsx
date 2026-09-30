import { AppShell } from "@/components/layout/app-shell";

/**
 * Las pestañas de `/app/*` (Inicio, Curso, Practicar, Pasos, Perfil, Progreso) van con AppShell.
 * El grupo `(tabs)` no cambia la URL (D091, extiende D072): deja fuera, sin navegación, lo que
 * va a pantalla completa (`/app/lessons/[id]`). La sesión y la Bienvenida hecha las exige cada
 * página con `requireOnboardedUser` (un layout no se vuelve a evaluar al navegar) y, antes, el
 * proxy (solo la sesión).
 */
export default function AppTabsLayout({ children }: LayoutProps<"/app">) {
  return <AppShell>{children}</AppShell>;
}
