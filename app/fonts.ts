import { Fraunces, Geist } from "next/font/google";

/**
 * Fuentes del sistema (D008). Las variables coinciden con `FONT_VARIABLES` de
 * `lib/tokens/css.ts`, que arma `--font-serif` / `--font-sans` en `app/tokens.css`.
 * Subconjunto `latin`: cubre todo el español (á, ñ, ü, ¿, ¡).
 */

// Variable con eje de tamaño óptico: los pesos 400/500 salen del mismo archivo.
export const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-fraunces",
});

export const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});
