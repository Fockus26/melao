import type * as React from "react";
import { fieldControlClasses } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Mismo cuerpo que Input; crece con el contenido desde dos líneas y media. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldControlClasses,
        "field-sizing-content min-h-24 py-3",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
