import { BottomNav } from "./bottom-nav";
import { SideNav, type SidePlan } from "./side-nav";
import { MAIN_ID, SkipLink } from "./skip-link";

type AppShellProps = {
  children: React.ReactNode;
  /** Ruta para el estado activo; sin ella se usa la del router (D060). */
  currentPath?: string;
  /** Card "Tu plan" del lateral; sin plan no se muestra. */
  plan?: SidePlan;
};

/**
 * Shell de la app del alumno (handoff §4): barra inferior de 80 < 1024 y lateral de 248
 * ≥ 1024. Columna centrada: 100 % con padding 20 (móvil), máx. 640 con padding 32 (tablet),
 * máx. 800 con padding 48 (escritorio). En móvil y tablet el contenido reserva abajo el alto
 * de la barra + su zona segura, más los 32 de ritmo entre secciones.
 */
export function AppShell({ children, currentPath, plan }: AppShellProps) {
  return (
    <div className="flex min-h-dvh bg-bg text-text">
      <SkipLink />
      <SideNav currentPath={currentPath} plan={plan} />
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="min-w-0 flex-1 px-5 pt-8 pb-[calc(var(--spacing-20)+var(--spacing-8)+env(safe-area-inset-bottom))] focus:outline-none md:px-8 lg:px-12 lg:pb-12"
      >
        <div className="mx-auto w-full max-w-160 lg:max-w-200">{children}</div>
      </main>
      <BottomNav currentPath={currentPath} />
    </div>
  );
}
