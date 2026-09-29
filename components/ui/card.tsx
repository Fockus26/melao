import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card (handoff §2): surface, borde 1 px divider, radio 12, padding 20 (16 en filas compactas).
 * **Sin sombra**: la jerarquía es surface + borde. `selected` pinta gold-tint + borde gold-600;
 * quien la usa agrega además texto o ícono (el color solo no basta).
 */
function Card({
  className,
  size = "default",
  selected = false,
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "compact";
  selected?: boolean;
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-selected={selected || undefined}
      className={cn(
        "flex flex-col gap-4 rounded-md border border-divider bg-surface p-5 text-text",
        "data-[size=compact]:gap-3 data-[size=compact]:p-4",
        "data-selected:border-gold-600 data-selected:bg-gold-tint",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("type-h4", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("type-small text-text-secondary", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={className} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex flex-wrap items-center gap-3", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
