import { cn } from "@/lib/utils";

/**
 * Logo de Melao: marca C1 · Modulada (D026, D079), copiada del tablero *Marca* del canvas de
 * diseño. Baldosa de radio 11 sobre viewBox 48 con la M en contraforma: astas gruesas (5) y
 * diagonales finas (2,6). Sin dorado en la marca: baldosa en `text` y M en `bg`, así en
 * oscuro se invierte sola (baldosa clara, M oscura), como en el tablero.
 * La versión reforzada para 16 px (astas 7, diagonales 5,5, radio 10) es `app/icon.svg`.
 * Wordmark: "Melao" en Fraunces 500 como texto (en web; los assets exportados lo traen en contornos).
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
        <rect width="48" height="48" rx="11" className="fill-text" />
        <path d="M14 35V13M34 35V13" strokeWidth="5" className="stroke-bg" />
        <path
          d="M15 13.5l9 15 9-15"
          fill="none"
          strokeWidth="2.6"
          strokeMiterlimit="10"
          className="stroke-bg"
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
