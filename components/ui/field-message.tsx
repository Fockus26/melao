import { CircleAlert, CircleCheck } from "lucide-react";
import type * as React from "react";
import { Spinner } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type FieldMessageTone = "help" | "error" | "success" | "pending";

/**
 * Ayuda o error bajo un campo (handoff §2 Input). El control lo referencia con
 * `aria-describedby`. Error y éxito llevan ícono además del color; "pending" es el estado
 * enviando (spinner de 14 en la ayuda).
 */
function FieldMessage({
  tone = "help",
  className,
  children,
  ...props
}: React.ComponentProps<"p"> & { tone?: FieldMessageTone }) {
  return (
    <p
      data-slot="field-message"
      data-tone={tone}
      className={cn(
        "flex items-start gap-1.5 type-small text-text-secondary",
        tone === "error" && "text-error",
        tone === "success" && "text-success",
        className,
      )}
      {...props}
    >
      {tone === "error" ? (
        <CircleAlert
          aria-hidden="true"
          strokeWidth={ICON_STROKE}
          className="mt-px size-4.5 shrink-0"
        />
      ) : null}
      {tone === "success" ? (
        <CircleCheck
          aria-hidden="true"
          strokeWidth={ICON_STROKE}
          className="mt-px size-4.5 shrink-0"
        />
      ) : null}
      {tone === "pending" ? <Spinner className="mt-0.75 size-3.5" /> : null}
      <span>{children}</span>
    </p>
  );
}

export { FieldMessage };
