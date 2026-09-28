"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type * as React from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Switch del handoff §2: 52 × 32, pastilla 24 a 4 px del borde que se desplaza 20 px en 200 ms.
 * Apagado: sunken + borde border-input + pastilla text-secondary. Encendido: primary.
 * Mide 32 de alto: va siempre dentro de `SwitchField` (label de ≥ 56 con el texto a la izquierda).
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-8 w-13 shrink-0 items-center rounded-pill border border-border-input bg-surface-sunken px-0.75",
        "transition-[background-color,border-color] duration-state ease-standard motion-reduce:transition-none",
        "data-checked:border-primary data-checked:bg-primary",
        "disabled:cursor-not-allowed disabled:border-divider disabled:data-checked:bg-surface-sunken",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-6 rounded-pill bg-text-secondary",
          "transition-[translate,background-color] duration-state ease-standard motion-reduce:transition-none",
          "data-checked:translate-x-5 data-checked:bg-on-primary",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

/** Fila táctil del switch: `<label>` de ≥ 56 de alto, texto a la izquierda y ayuda opcional. */
function SwitchField({
  label,
  description,
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  label: React.ReactNode;
  description?: React.ReactNode;
}) {
  const id = useId();
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: el control es el <button role="switch"> de Radix, anidado.
    <label
      data-slot="switch-field"
      className={cn(
        "flex min-h-14 cursor-pointer items-center justify-between gap-4 py-2 has-disabled:cursor-not-allowed",
        className,
      )}
    >
      <span className="flex flex-col">
        <span id={`${id}-label`} className="type-body text-text">
          {label}
        </span>
        {description ? (
          <span
            id={`${id}-description`}
            className="type-small text-text-secondary"
          >
            {description}
          </span>
        ) : null}
      </span>
      {/* Nombre = solo la etiqueta; la ayuda va como descripción, no dentro del nombre. */}
      <Switch
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        {...props}
      />
    </label>
  );
}

export { Switch, SwitchField };
