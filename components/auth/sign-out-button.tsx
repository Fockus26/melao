import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/lib/auth/redirect";

/**
 * Cerrar sesión: formulario POST a `/auth/logout` (funciona sin JS y no lo dispara un prefetch).
 */
export function SignOutButton() {
  return (
    <form action={AUTH_ROUTES.signOut} method="post">
      <Button type="submit" variant="outline">
        Cerrar sesión
      </Button>
    </form>
  );
}
