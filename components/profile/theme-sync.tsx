"use client";

import { useEffect } from "react";
import { themeToApply } from "@/lib/profile/profile";
import { readThemePreference, setThemePreference } from "@/lib/theme";

/**
 * Alinea el tema de este navegador con `profiles.theme` al cargar la app con sesión: si
 * difieren, manda el perfil (D136). No pinta nada. El primer pintado sigue siendo el del
 * navegador (script de `<head>`), así que solo cambia de golpe si se eligió otro en otro lado.
 */
export function ThemeSync({ theme }: { theme: string | null | undefined }) {
  useEffect(() => {
    const next = themeToApply(theme, readThemePreference());
    if (next) setThemePreference(next);
  }, [theme]);
  return null;
}
