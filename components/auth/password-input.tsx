"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { IconButton } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Input de contraseña con el botón ojo de 48 × 48 dentro, a la derecha (handoff §2). El botón
 * conserva su nombre y comunica el estado con `aria-pressed` (no solo con el ícono).
 */
export function PasswordInput({
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cn("pr-12", className)}
        {...props}
      />
      <IconButton
        aria-label="Mostrar contraseña"
        aria-pressed={visible}
        aria-controls={props.id}
        disabled={disabled}
        onClick={() => setVisible((v) => !v)}
        className={cn(
          // El botón (48 × 48, el objetivo táctil) se apoya sobre el borde del input; el fondo
          // de hover va en ::before, 1 px hacia adentro y con el radio del input menos ese borde:
          // no tapa el borde ni deja esquinas cortadas. El foco se dibuja por dentro del input.
          "absolute inset-y-0 right-0 rounded-l-none rounded-r-sm hover:bg-transparent",
          "before:pointer-events-none before:absolute before:inset-px before:rounded-l-none before:rounded-r-[calc(var(--radius-sm)-1px)]",
          "before:transition-[background-color] before:duration-hover before:ease-standard motion-reduce:before:transition-none",
          "hover:before:bg-hover disabled:hover:before:bg-transparent [&_svg]:relative",
          "focus-visible:-outline-offset-4",
        )}
      >
        <Icon aria-hidden="true" strokeWidth={ICON_STROKE} />
      </IconButton>
    </div>
  );
}
