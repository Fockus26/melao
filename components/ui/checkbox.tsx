"use client";

import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type * as React from "react";
import { ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Casilla (handoff: P-Planes, términos del checkout; P-Bienvenida, estilos): 24 px, radio sm,
 * borde `border-input`; marcada, `primary` con check en `on-primary` (el check la distingue
 * además del color). En error, borde `error` con `aria-invalid`. Se nombra con `id` + `<label htmlFor>`.
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // El ::after extiende el área táctil a 48 × 48 sin mover el diseño.
        "peer relative inline-flex size-6 shrink-0 after:absolute after:-inset-3",
        "items-center justify-center rounded-sm border border-border-input bg-bg text-on-primary",
        "transition-[background-color,border-color] duration-hover ease-standard motion-reduce:transition-none",
        "hover:border-text",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        "aria-invalid:border-error",
        "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-sunken disabled:text-text-muted",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator">
        <Check
          aria-hidden="true"
          strokeWidth={ICON_STROKE}
          className="size-4.5"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
