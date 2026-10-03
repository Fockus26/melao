/**
 * Encabezado de una pantalla del admin (handoff §3 Admin): overline + h1 a la izquierda y
 * acciones a la derecha; las acciones bajan de línea si no caben.
 */
export function AdminPageHeader({
  overline,
  title,
  actions,
}: {
  overline: string;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="type-eyebrow text-text-secondary">{overline}</p>
        <h1 className="type-h1">{title}</h1>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </header>
  );
}
