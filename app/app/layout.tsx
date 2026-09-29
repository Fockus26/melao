import { AppShell } from "@/components/layout/app-shell";

/**
 * Todo `/app/*` va con AppShell (D072: carpeta real `app/app/`, sin grupo, porque la URL ya es
 * `/app`). La sesión la exige cada página con `requireUser` (un layout no se vuelve a evaluar
 * al navegar) y, antes, el proxy.
 */
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return <AppShell>{children}</AppShell>;
}
