import { cn } from "@/lib/utils";

export interface BeatCell {
  /** Tiempo 1-based. */
  beat: number;
  /** No se cuenta en voz alta (4 y 8 en salsa): se pinta "·". */
  silent: boolean;
  active: boolean;
}

/** Celdas de la tira: una por tiempo de la frase. `activeBeat` fuera de rango = ninguna activa. */
export function beatCells(
  beatsPerPhrase: number,
  silentBeats: readonly number[],
  activeBeat: number | null,
): BeatCell[] {
  const silent = new Set(silentBeats);
  return Array.from({ length: Math.max(0, beatsPerPhrase) }, (_, i) => ({
    beat: i + 1,
    silent: silent.has(i + 1),
    active: activeBeat === i + 1,
  }));
}

/** Textos por defecto (provisionales, CONTENT_CHECKLIST fila 36). */
export const beatRowLabel = "Tiempos de la frase";
export const beatSilentLabel = (beat: number) => `${beat}, en silencio`;

/**
 * BeatRow (handoff §5, escenario punto 5): la tira de tiempos. Sin reloj propio: el escenario
 * le pasa `activeBeat` desde el reloj de audio; el número cambia al instante, sin transición.
 * Va sobre fondo `stage-bg` (fijo en ambos temas); el componente no pinta fondo.
 * Tiempo activo = número blanco 600 **y** barra de 8 px de alto (forma + color). Los silenciosos
 * muestran "·" con una barra-punto de 8 px de ancho.
 * Accesibilidad (D058): es una lista `<ol>` con el tiempo activo en `aria-current`; nada de
 * `aria-live`, que anunciaría 3 tiempos por segundo. El coach de voz es el canal del ritmo.
 */
export function BeatRow({
  beatsPerPhrase,
  activeBeat,
  silentBeats = [],
  label = beatRowLabel,
  silentLabel = beatSilentLabel,
  className,
}: {
  beatsPerPhrase: number;
  /** Tiempo que suena (1-based) o `null` antes de empezar / en pausa sin tiempo. */
  activeBeat: number | null;
  /** Tiempos que no se cuentan (los que no están en `spokenBeats` del estilo). */
  silentBeats?: readonly number[];
  label?: string;
  silentLabel?: (beat: number) => string;
  className?: string;
}) {
  const cells = beatCells(beatsPerPhrase, silentBeats, activeBeat);
  return (
    <ol
      data-slot="beat-row"
      aria-label={label}
      className={cn("grid gap-1.5", className)}
      style={{
        gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))`,
      }}
    >
      {cells.map(({ beat, silent, active }) => (
        <li
          key={beat}
          aria-current={active ? "true" : undefined}
          data-active={active}
          data-silent={silent}
          className="flex flex-col items-center gap-1"
        >
          <span
            className={cn(
              "type-stage-beat",
              active
                ? "font-semibold text-stage-count"
                : "text-stage-beat-inactive",
            )}
          >
            {silent ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="sr-only">{silentLabel(beat)}</span>
              </>
            ) : (
              beat
            )}
          </span>
          <span aria-hidden="true" className="flex h-2 w-full justify-center">
            <span
              className={cn(
                silent ? "w-2" : "w-full",
                active ? "h-2 bg-stage-count" : "h-1 bg-stage-track",
              )}
            />
          </span>
        </li>
      ))}
    </ol>
  );
}
