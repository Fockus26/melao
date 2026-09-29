import type { StageView } from "@/lib/stage/view";
import { cn } from "@/lib/utils";
import { currentName, stageCopy } from "./copy";

/** "frase 2 de 2" o nada (intro, final). */
export function phraseText(view: StageView): string | null {
  return view.phrase
    ? stageCopy.phrase(view.phrase.index, view.phrase.count)
    : null;
}

/**
 * CurrentStep (handoff §3 punto 3): "AHORA" + paso actual a la izquierda, "frase 2 de 2" a la
 * derecha (tabulares), borde inferior 1 px `track`. Apaisado va en la cabecera (StageHeader).
 * El nombre reserva dos líneas para que un nombre largo no empuje la cuenta (D069).
 */
export function CurrentStep({
  view,
  className,
}: {
  view: StageView;
  className?: string;
}) {
  const phrase = phraseText(view);
  return (
    <div
      data-slot="stage-current"
      className={cn(
        "flex items-end justify-between gap-3 border-b border-stage-track pb-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="type-stage-label text-stage-label">{stageCopy.now}</p>
        <p className="flex min-h-14 items-end type-stage-current break-words text-stage-current">
          {currentName(view)}
        </p>
      </div>
      {phrase && (
        <p className="shrink-0 type-small tabular-nums text-stage-secondary">
          {phrase}
        </p>
      )}
    </div>
  );
}
