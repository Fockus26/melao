import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Pill de estado (handoff §2): alto 24, padding 0 10, radio pill, texto 12/600, borde 1 px.
 * Siempre con texto; el ícono es opcional (14 px).
 */
const badgeVariants = cva(
  [
    "inline-flex h-6 w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-pill border px-2.5 type-caption font-semibold",
    "[&>svg]:pointer-events-none [&>svg]:size-3.5 [&>svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        neutral: "border-divider text-text",
        ok: "border-success text-success",
        warning: "border-warning text-warning",
        error: "border-error text-error",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      data-variant={variant ?? "neutral"}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
