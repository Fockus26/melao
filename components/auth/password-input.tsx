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
        className="absolute inset-y-0 right-0 rounded-sm"
      >
        <Icon aria-hidden="true" strokeWidth={ICON_STROKE} />
      </IconButton>
    </div>
  );
}
