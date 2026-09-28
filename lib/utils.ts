import { createCn } from "cn/config";

/**
 * Nombres de los tokens que el motor de `cn` no puede adivinar (D046). Sin esto, `text-small`
 * (tamaño) y `text-text` (color) caen en el mismo grupo y uno borra al otro, y `rounded-pill`
 * o `shadow-sheet` no se reconocen como radio o sombra. Un test los compara con
 * `design/tokens.json`: si se agrega un rol o un radio, el test avisa.
 */
export const TEXT_ROLES = [
  "display-xl",
  "display",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "body",
  "small",
  "caption",
  "eyebrow",
  "overline",
  "button",
  "button-lg",
  "numeric-xl",
  "numeric-lg",
  "stage-count",
  "stage-next",
  "stage-current",
  "stage-beat",
  "stage-label",
] as const;

export const RADII = ["none", "sm", "md", "lg", "pill"] as const;
export const SHADOWS = ["sheet", "modal", "drag"] as const;
export const DURATIONS = [
  "press",
  "hover",
  "state",
  "move",
  "enter",
  "spin",
  "pulse",
] as const;

/** Une clases como `clsx` y resuelve conflictos como `tailwind-merge`, con los tokens de Melao. */
export const cn = createCn({
  extend: {
    theme: {
      text: [...TEXT_ROLES],
      radius: [...RADII],
      shadow: [...SHADOWS],
    },
    classGroups: {
      // type-<rol> fija familia, tamaño, interlineado, peso y tracking de una vez (D035).
      "type-role": [{ type: [...TEXT_ROLES] }],
      duration: [{ duration: [...DURATIONS] }],
    },
  },
});
