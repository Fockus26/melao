import { cn } from "@/lib/utils";

/** Enlace de texto de auth: subrayado gold-500 decorativo, texto en `text` (D002), 48 de alto. */
export const AUTH_LINK =
  "inline-flex min-h-12 items-center rounded-sm text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text";

/** El mismo enlace dentro de una frase: sin alto mínimo (excepción de destinos en línea). */
export const AUTH_INLINE_LINK =
  "rounded-sm text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text";

type AuthPanelProps = {
  title: string;
  /** Una línea bajo el filete (recuperar, restablecer). */
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Enlace cruzado al pie ("¿No tienes cuenta? Crea una"). */
  footer?: React.ReactNode;
};

/**
 * Columna de las pantallas de auth (handoff P-Auth): máx. 440, padding 32 24, gap 24, h1 +
 * filete dorado de 48 × 1 (decorativo). En escritorio igual, centrada y sin panel lateral.
 */
export function AuthPanel({
  title,
  description,
  children,
  footer,
}: AuthPanelProps) {
  return (
    <div className="mx-auto flex w-full max-w-110 flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-3">
        <h1 className="type-h1">{title}</h1>
        <span aria-hidden="true" className="block h-px w-12 bg-gold-500" />
        {description ? (
          <p className="type-body text-text-secondary">{description}</p>
        ) : null}
      </header>
      {children}
      {footer ? (
        <p className="type-small text-text-secondary">{footer}</p>
      ) : null}
    </div>
  );
}

/** Separador "o con tu correo" entre Google y el formulario: líneas decorativas + texto. */
export function OrDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span aria-hidden="true" className="h-px flex-1 bg-divider" />
      <span className="type-small text-text-secondary">o con tu correo</span>
      <span aria-hidden="true" className="h-px flex-1 bg-divider" />
    </div>
  );
}
