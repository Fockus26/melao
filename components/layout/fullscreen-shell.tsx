import { MAIN_ID, SkipLink } from "./skip-link";

type FullscreenShellProps = {
  /** Barra superior: en la lección, X (con confirmación) + LessonProgress + "n / 6". */
  bar: React.ReactNode;
  children: React.ReactNode;
  /**
   * `default`: lección (fondo del tema, columna de 640, padding 24).
   * `stage`: sesión en escenario, negro en ambos temas (D007).
   */
  variant?: "default" | "stage";
};

/**
 * Pantalla completa sin navegación (handoff §3 Lección y Sesión). La salida es la X de la
 * barra, que pone la pantalla; la shell solo da estructura, saltar al contenido y el `<main>`.
 */
export function FullscreenShell({
  bar,
  children,
  variant = "default",
}: FullscreenShellProps) {
  if (variant === "stage") {
    return (
      // `dark` en el subárbol: el escenario no hereda el tema de la app. Sus colores son los
      // stage-* (fijos) y el anillo de foco y cualquier token suelto toman el valor oscuro.
      // Padding 12 20 28 (handoff §3 Sesión) + zona segura abajo.
      <div
        data-variant="stage"
        className="dark flex min-h-dvh flex-col bg-stage-bg px-5 pt-3 pb-[calc(var(--spacing-7)+env(safe-area-inset-bottom))] text-stage-current"
      >
        <SkipLink />
        <header className="flex min-h-12 items-center gap-3">{bar}</header>
        <main
          id={MAIN_ID}
          tabIndex={-1}
          className="flex min-w-0 flex-1 flex-col focus:outline-none"
        >
          {children}
        </main>
      </div>
    );
  }

  return (
    <div
      data-variant="default"
      className="flex min-h-dvh flex-col bg-bg text-text"
    >
      <SkipLink />
      <header className="sticky top-0 z-nav border-b border-divider bg-bg px-6">
        <div className="mx-auto flex min-h-16 w-full max-w-160 items-center gap-3 py-2">
          {bar}
        </div>
      </header>
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="min-w-0 flex-1 px-6 pt-8 pb-[calc(var(--spacing-8)+env(safe-area-inset-bottom))] focus:outline-none"
      >
        <div className="mx-auto w-full max-w-160">{children}</div>
      </main>
    </div>
  );
}
