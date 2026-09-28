"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";
import { Toggle as TogglePrimitive } from "radix-ui";
import type * as React from "react";
import { ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Chip (handoff §2) y segmento del SegmentedControl. Los dos llevan el check de 18 delante
 * cuando están activos: el estado nunca depende solo del color.
 */
const toggleVariants = cva(
  [
    "group/toggle relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap type-small font-medium text-text",
    "transition-[background-color,border-color,color] duration-hover ease-standard motion-reduce:transition-none",
    "hover:bg-hover disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent",
    "data-[state=on]:font-semibold",
    "[&_svg]:pointer-events-none [&_svg]:size-4.5 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        // Chip: 40 visibles; el pseudo-elemento sale 5 arriba y abajo desde el borde interior
        // (38 + 10) → zona táctil de 48.
        chip: [
          "h-10 rounded-sm border border-border-input px-3.5",
          "before:absolute before:inset-x-0 before:-inset-y-1.25 before:content-['']",
          "data-[state=on]:border-gold-600 data-[state=on]:bg-gold-tint data-[state=on]:hover:bg-gold-tint",
        ],
        // Segmento: 40 dentro de un contenedor con padding 4 → 48 en total.
        segment: [
          "h-10 flex-1 rounded-pill px-4 duration-state",
          // Zona táctil de 48: el pseudo-elemento cubre el padding del contenedor.
          "before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
          "data-[state=on]:bg-primary data-[state=on]:text-on-primary data-[state=on]:hover:bg-primary",
        ],
      },
    },
    defaultVariants: { variant: "chip" },
  },
);

/** Check que solo se ve en el estado activo (lo decide el CSS: sirve en servidor y cliente). */
function ToggleCheck() {
  return (
    <Check
      aria-hidden="true"
      strokeWidth={ICON_STROKE}
      className="hidden group-data-[state=on]/toggle:block"
    />
  );
}

function Toggle({
  className,
  variant,
  children,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant }), className)}
      {...props}
    >
      <ToggleCheck />
      {children}
    </TogglePrimitive.Root>
  );
}

export { Toggle, ToggleCheck, toggleVariants };
