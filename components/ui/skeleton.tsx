import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton (handoff §2): bg skeleton, radio 8 (12 si imita un botón: `rounded-md`), pulso de
 * opacidad 1 → .55 → 1 en 1600 ms; sin pulso con `prefers-reduced-motion`. Decorativo: la
 * sección que carga lleva `aria-busy` y un texto para lectores de pantalla.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "animate-skeleton rounded-sm bg-skeleton motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
