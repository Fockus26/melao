"use client";

import type { VariantProps } from "class-variance-authority";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import * as React from "react";
import { ToggleCheck, toggleVariants } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

type ToggleVariant = VariantProps<typeof toggleVariants>["variant"];

const ToggleGroupContext = React.createContext<ToggleVariant>("chip");

/**
 * Grupo de chips o SegmentedControl (handoff §2).
 * - `type="multiple"` → filtros: `role="toolbar"` + `aria-pressed` en cada chip.
 * - `type="single"` → elección única: `role="radiogroup"` + `role="radio"` + `aria-checked`.
 * Las filas de chips hacen `flex-wrap`, nunca scroll horizontal. El segmentado es un contenedor
 * pill con borde y padding 4; el indicador que se desliza del prototipo no está (cambia el
 * color en 200 ms).
 */
function ToggleGroup({
  className,
  variant = "chip",
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  variant?: ToggleVariant;
}) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      className={cn(
        variant === "segment"
          ? "flex w-full gap-1 rounded-pill border border-border-input p-1"
          : "flex flex-wrap gap-2",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={variant}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  const variant = React.useContext(ToggleGroupContext);
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(toggleVariants({ variant }), className)}
      {...props}
    >
      <ToggleCheck />
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
