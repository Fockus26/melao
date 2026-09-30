import { AppShell } from "@/components/layout/app-shell";

/**
 * Todo `/app/*` va con AppShell (D072: carpeta real `app/app/`, sin grupo, porque la URL ya es
 * `/app`). La sesión y la Bienvenida hecha las exige cada página con `requireOnboardedUser`
 * (un layout no se vuelve a evaluar al navegar) y, antes, el proxy (solo la sesión).
 */
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return <AppShell>{children}</AppShell>;
}
