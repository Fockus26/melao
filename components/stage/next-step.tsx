import type { StageView } from "@/lib/stage/view";
import { cn } from "@/lib/utils";
import { stageCopy } from "./copy";

/**
 * NextStep (handoff §3 punto 4): columna junto a la cuenta con filete vertical `rule`.
 * "SIGUIENTE" → "SIGUIENTE · EN EL 1" desde el anuncio (D011), nombre en `next`, filete de 2 px
 * que crece de 0 a 48 en 240 ms y "entra en el 1". Si el paso se repite: "SE REPITE" + "solo
 * cuenta, sin nombrarlo", sin filete. El filete y la ayuda reservan su alto siempre para que
 * la columna no salte al anunciar; los nombres largos parten línea.
 */
export function NextStep({
  view,
  className,
}: {
  view: Pick<StageView, "next" | "repeats" | "announced">;
  className?: string;
}) {
  const { next, repeats, announced } = view;
  const label = repeats
    ? stageCopy.repeats
    : announced && next
      ? stageCopy.nextOnOne
      : stageCopy.next;
  const hint = repeats ? stageCopy.repeatsHint : stageCopy.entersOnOne;
  const showHint = repeats || (announced && next !== null);
  const rule = announced && !repeats && next !== null;
  return (
    <div
      data-slot="stage-next"
      data-announced={rule}
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-2 border-l border-stage-rule pl-4",
        className,
      )}
    >
      <p className="type-stage-label text-stage-label">{label}</p>
      <p
        className={cn(
          "type-stage-next break-words",
          next ? "text-stage-next" : "text-stage-secondary",
        )}
      >
        {next?.name ?? stageCopy.lastStep}
      </p>
      <span aria-hidden="true" className="flex h-0.5">
        <span
          className={cn(
            "h-0.5 bg-stage-rule transition-[width] duration-move ease-standard motion-reduce:transition-none",
            rule ? "w-12" : "w-0",
          )}
        />
      </span>
      <p
        className={cn(
          "type-small text-stage-secondary",
          !showHint && "invisible",
        )}
      >
        {hint}
      </p>
    </div>
  );
}
