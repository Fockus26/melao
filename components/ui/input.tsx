import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Cuerpo común de Input, Textarea y el disparador de Select (handoff §2): borde 1 px
 * border-input, radio 8, texto 16 px (evita el zoom de iOS). El foco es borde + sombra interior
 * de 1 px en `text`, **no** el anillo externo global. Error: `aria-invalid`. Éxito:
 * `data-status="success"` (el mensaje con ícono lo pone `FieldMessage`: nunca solo color).
 */
export const fieldControlClasses = cn(
  "w-full min-w-0 rounded-sm border border-border-input bg-bg px-3.5 type-body text-text",
  "transition-[border-color,box-shadow] duration-hover ease-standard motion-reduce:transition-none",
  "placeholder:text-text-muted hover:border-text",
  "focus-visible:border-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text focus-visible:ring-inset",
  "data-[status=success]:border-success",
  "aria-invalid:border-error aria-invalid:ring-1 aria-invalid:ring-error aria-invalid:ring-inset",
  "disabled:cursor-not-allowed disabled:border-divider disabled:bg-surface-sunken disabled:text-text-muted disabled:hover:border-divider",
);

function Input({
  className,
  type = "text",
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(fieldControlClasses, "h-12", className)}
      {...props}
    />
  );
}

export { Input };
