import { AdminShell } from "@/components/layout/admin-shell";
import { requireAdmin } from "@/lib/auth/session";

/**
 * `/admin/*` con AdminShell. El rol se exige aquí (sin rol, 404 sin pintar el menú del admin) y
 * otra vez en cada página, porque un layout no se vuelve a evaluar al navegar (D073).
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin("/admin");
  return <AdminShell>{children}</AdminShell>;
}
