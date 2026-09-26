"use client";

import { useSyncExternalStore } from "react";
import {
  readThemePreference,
  setThemePreference,
  subscribeThemePreference,
  THEME_PREFERENCES,
  type ThemePreference,
} from "@/lib/theme";

const LABELS: Record<ThemePreference, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Sistema",
};

/**
 * Conmutador de tema (claro / oscuro / sistema) con radios nativos: flechas del teclado,
 * lector de pantalla y estado seleccionado sin depender del color. El de Perfil llega en 07b.
 */
export function ThemeSwitch() {
  const preference = useSyncExternalStore(
    subscribeThemePreference,
    readThemePreference,
    () => "system" as const,
  );

  return (
    <fieldset className="inline-flex flex-wrap gap-1 rounded-pill border border-border-input p-1">
      <legend className="sr-only">Tema</legend>
      {THEME_PREFERENCES.map((value) => (
        <label
          key={value}
          className="type-button relative flex min-h-12 cursor-pointer items-center gap-2 rounded-pill px-4 text-text transition-[background-color,color] duration-hover ease-standard hover:bg-hover has-checked:bg-primary has-checked:text-on-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring"
        >
          <input
            type="radio"
            name="theme"
            value={value}
            checked={preference === value}
            onChange={() => setThemePreference(value)}
            className="sr-only"
          />
          <span aria-hidden="true" className="w-3 text-center">
            {preference === value ? "✓" : ""}
          </span>
          {LABELS[value]}
        </label>
      ))}
    </fieldset>
  );
}
