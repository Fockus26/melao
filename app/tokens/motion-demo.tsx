"use client";

import { useState } from "react";

/**
 * Demostración de una duración + curva. Solo se mueve al pulsar (nada autoanimado) y con
 * `prefers-reduced-motion` el punto salta sin transición.
 */
export function MotionDemo({
  duration,
  easing,
  label,
}: {
  duration: string;
  easing: string;
  label: string;
}) {
  const [moved, setMoved] = useState(false);
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => setMoved((m) => !m)}
        aria-pressed={moved}
        className="type-button min-h-12 shrink-0 rounded-md border border-border-input px-4 text-text transition-[background-color] duration-hover ease-standard hover:bg-hover"
      >
        Probar <span className="sr-only">{label}</span>
      </button>
      <div
        aria-hidden="true"
        className="relative h-2 min-w-0 flex-1 rounded-pill bg-surface-sunken"
      >
        <span
          className="absolute top-1/2 left-0 size-4 -translate-y-1/2 rounded-pill bg-gold-600 transition-[left] motion-reduce:transition-none"
          style={{
            left: moved ? "calc(100% - var(--spacing-4))" : "0",
            transitionDuration: `var(--${duration})`,
            transitionTimingFunction: `var(--${easing})`,
          }}
        />
      </div>
    </div>
  );
}
