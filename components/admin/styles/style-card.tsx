import type { ReactNode } from "react";

/**
 * Card por tema de la pantalla de Estilos (handoff §3 Admin: "columna 880; cards por tema"):
 * `<section>` con título h2, descripción opcional y contenido. Mismo borde, fondo y padding que
 * `EditorCard`.
 */
export function StyleCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-5 rounded-md border border-divider bg-surface p-5 md:px-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={id} className="type-h4">
          {title}
        </h2>
        {description ? (
          <p className="type-small text-text-secondary">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
