"use client";

import { Label as LabelPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

/** Etiqueta de campo: small 500, arriba del control (el contenedor pone el gap de 6). */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "type-small font-medium text-text peer-disabled:cursor-not-allowed peer-disabled:text-text-muted",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
