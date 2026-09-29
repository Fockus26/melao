import { cn } from "@/lib/utils";

/**
 * Count (handoff §3 punto 4): el número grande, 160/150 en caja fija de 120 alineada a la
 * izquierda, con cifras tabulares (D035) para que "8" y "·" no muevan nada. Cambia al instante,
 * sin transición. `aria-hidden`: se renovaría 3 veces por segundo (D068).
 */
export function Count({
  beat,
  silent,
  className,
}: {
  /** Tiempo en la frase o `null` (antes de la entrada / al terminar). */
  beat: number | null;
  silent: boolean;
  className?: string;
}) {
  return (
    <p
      aria-hidden="true"
      data-slot="stage-count"
      className={cn(
        "w-30 shrink-0 whitespace-nowrap type-stage-count",
        silent || beat === null
          ? "text-stage-beat-inactive"
          : "text-stage-count",
        className,
      )}
    >
      {beat === null || silent ? "·" : beat}
    </p>
  );
}
