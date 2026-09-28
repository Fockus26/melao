"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

type SliderProps = Omit<
  React.ComponentProps<typeof SliderPrimitive.Root>,
  "aria-label" | "aria-labelledby"
> & {
  /** Id de la etiqueta visible; va en el pulgar, que es el `role="slider"`. */
  "aria-labelledby"?: string;
  "aria-label"?: string;
  /** Texto del valor para lectores de pantalla ("3 de 5 · Media"): `aria-valuetext`. Úsalo con `value` controlado. */
  valueText?: (value: number) => string;
};

/**
 * Slider del handoff §2: riel de 4 px en divider, relleno gold-600, pulgar de 24 con borde 2 px
 * text sobre bg. El control mide 48 de alto y el pulgar tiene zona táctil de 48.
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  valueText,
  "aria-labelledby": labelledBy,
  "aria-label": label,
  ...props
}: SliderProps) {
  const values = value ?? defaultValue ?? [min];

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex h-12 w-full touch-none select-none items-center data-disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-1 grow overflow-hidden rounded-pill bg-divider"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-full bg-gold-600"
        />
      </SliderPrimitive.Track>
      {values.map((thumbValue, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          // Los pulgares no se reordenan: el índice es su identidad.
          // biome-ignore lint/suspicious/noArrayIndexKey: posición fija del pulgar.
          key={index}
          aria-labelledby={labelledBy}
          aria-label={label}
          aria-valuetext={valueText?.(thumbValue)}
          className={cn(
            "relative block size-6 shrink-0 cursor-grab rounded-pill border-2 border-text bg-bg active:cursor-grabbing",
            "after:absolute after:-inset-3 after:content-['']",
            "disabled:pointer-events-none",
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
