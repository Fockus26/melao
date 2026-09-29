import { PublicShell } from "@/components/layout/public-shell";

/**
 * Pantallas de auth (`/login`, `/register`, `/forgot-password`, `/reset-password`): PublicShell con
 * solo el logo (sin enlaces de la landing, que distraen del formulario). Grupo `(auth)`: no
 * cambia las URLs (D072).
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <PublicShell header="account">{children}</PublicShell>;
}
