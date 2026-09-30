"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Aviso de la raíz a sus opciones: la última tecla fue una flecha y todavía no llegó el foco.
 * Patrón radio de WAI-ARIA: la flecha mueve el foco **y** elige. Radix mueve el foco en un
 * setTimeout y solo elige si la tecla sigue abajo en ese momento; con una pulsación rápida
 * mueve el foco pero no elige (se midió en la Bienvenida). Aquí la flecha deja el aviso hasta
 * el foco siguiente, y ese foco hace clic en la opción (el mismo camino que usa Radix).
 */
const ArrowKeyContext = React.createContext<React.RefObject<boolean> | null>(
  null,
);

/**
 * Grupo de opciones de elección única (`role="radiogroup"`). Se nombra con `aria-labelledby`
 * o `aria-label`. Teclado: Tab entra en la opción elegida (o la primera), las flechas mueven
 * y eligen, Espacio elige.
 */
function RadioGroup({
  className,
  onKeyDownCapture,
  onPointerDownCapture,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  const arrowKey = React.useRef(false);
  return (
    <ArrowKeyContext.Provider value={arrowKey}>
      <RadioGroupPrimitive.Root
        data-slot="radio-group"
        className={cn("flex flex-col gap-3", className)}
        onKeyDownCapture={(e) => {
          arrowKey.current = e.key.startsWith("Arrow");
          onKeyDownCapture?.(e);
        }}
        onPointerDownCapture={(e) => {
          arrowKey.current = false;
          onPointerDownCapture?.(e);
        }}
        {...props}
      />
    </ArrowKeyContext.Provider>
  );
}

/**
 * Opción del grupo. Sin `children` es el radio de 24 (anillo `border-input`; elegido, anillo
 * de 7 en `primary`, que se distingue además por la forma) con el área táctil llevada a 48 por
 * un ::after. Con `children` no trae estilo propio: el que llama la viste (p. ej. las cards de
 * la Bienvenida) y lee el estado de `data-state="checked"`.
 */
function RadioGroupItem({
  className,
  children,
  onFocus,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  const arrowKey = React.useContext(ArrowKeyContext);
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        children == null && [
          "relative size-6 shrink-0 rounded-pill border-2 border-border-input bg-bg after:absolute after:-inset-3",
          "transition-[border-color,border-width] duration-hover ease-standard motion-reduce:transition-none",
          "hover:border-text data-[state=checked]:border-7 data-[state=checked]:border-primary",
          "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-sunken",
        ],
        className,
      )}
      onFocus={(e) => {
        onFocus?.(e);
        if (!arrowKey?.current) return;
        arrowKey.current = false;
        // Clic y no `onValueChange`: vale igual con el grupo controlado o sin controlar.
        e.currentTarget.click();
      }}
      {...props}
    >
      {children}
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
