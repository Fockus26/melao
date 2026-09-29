import { cn } from "@/lib/utils";

/**
 * Logo de Melao — **placeholder** hasta que se exporte el SVG del logo C1 (CONTENT_CHECKLIST
 * fila 37, D061). Todo el logo vive aquí: al llegar el SVG se cambia este archivo y nada más.
 *
 * Marca: baldosa de radio 10 sobre viewBox 48 (handoff §5) en `primary` con una M de trazo
 * en `on-primary`: en oscuro sale dorada con la M negra, como la versión de app.
 * Wordmark: "Melao" en Fraunces 500 (el SVG final lo trae convertido a contornos).
 */
const SIZES = {
  // Header y lateral: marca 28 + wordmark (22 en el handoff; 24 = rol h2, sin tamaño nuevo).
  md: { mark: "size-7", wordmark: "text-h2" },
  // Footer: marca 24.
  sm: { mark: "size-6", wordmark: "text-h3" },
} as const;

type LogoProps = {
  size?: keyof typeof SIZES;
  /** `false`: solo la marca, con "Melao" para lectores de pantalla. */
  wordmark?: boolean;
  /** Clases extra del wordmark, p. ej. ocultarlo en el riel del admin (`max-xl:sr-only`). */
  wordmarkClassName?: string;
  className?: string;
};

export function Logo({
  size = "md",
  wordmark = true,
  wordmarkClassName,
  className,
}: LogoProps) {
  const s = SIZES[size];
  return (
    <span className={cn("inline-flex items-center gap-2 text-text", className)}>
      <svg
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
        className={cn(s.mark, "shrink-0")}
      >
        <rect width="48" height="48" rx="10" className="fill-primary" />
        <path
          d="M14 34V14l10 12 10-12v20"
          fill="none"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-on-primary"
        />
      </svg>
      <span
        className={cn(
          "font-serif font-medium leading-none",
          s.wordmark,
          !wordmark && "sr-only",
          wordmarkClassName,
        )}
      >
        Melao
      </span>
    </span>
  );
}
