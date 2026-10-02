import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/lib/auth/redirect";

/**
 * Cerrar sesión: formulario POST a `/auth/logout` (funciona sin JS y no lo dispara un prefetch).
 * Vive en Perfil (outline a ancho completo, handoff § Perfil).
 */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={AUTH_ROUTES.signOut} method="post" className={className}>
      <Button type="submit" variant="outline" className={className}>
        Cerrar sesión
      </Button>
    </form>
  );
}
