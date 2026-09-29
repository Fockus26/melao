import { AdminNav } from "./admin-nav";
import { MAIN_ID, SkipLink } from "./skip-link";

/**
 * Shell del admin (handoff §4 y §3 Admin): nav 232 ≥ 1280 o riel 72 debajo + contenido a
 * ancho completo, sin columna máxima. Padding 24 28 (riel) · 32 40 (≥ 1280). Debajo de 1024
 * se queda el riel: el admin es de tablet y escritorio (D062).
 */
export function AdminShell({
  children,
  currentPath,
}: {
  children: React.ReactNode;
  /** Ruta para el estado activo; sin ella se usa la del router (D060). */
  currentPath?: string;
}) {
  return (
    <div className="flex min-h-dvh bg-bg text-text">
      <SkipLink />
      <AdminNav currentPath={currentPath} />
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="min-w-0 flex-1 px-7 py-6 focus:outline-none xl:px-10 xl:py-8"
      >
        {children}
      </main>
    </div>
  );
}
