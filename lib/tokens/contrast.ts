/**
 * Contraste WCAG 2.1 y los pares texto/superficie que declara `design/HANDOFF.md` §1.1–1.2.
 * Los tests exigen que cada par pase AA; la página `/tokens` muestra el ratio calculado.
 */

import {
  type ColorScheme,
  colorValue,
  type DesignTokens,
  tokens,
} from "./model";

export const AA_TEXT = 4.5;
/** Gráficos informativos, bordes de controles y foco (WCAG 1.4.11). */
export const AA_GRAPHIC = 3;

export type PairKind = "text" | "graphic";

export interface ContrastPair {
  scheme: ColorScheme;
  fg: string;
  bg: string;
  kind: PairKind;
}

/** `#RGB`, `#RRGGBB` o `rgb[a](r,g,b[,a])` → canales 0–255 y alfa 0–1. */
export function parseColor(input: string): {
  r: number;
  g: number;
  b: number;
  a: number;
} {
  const value = input.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((d) => d + d)
            .join("")
        : hex[1];
    return {
      r: Number.parseInt(digits.slice(0, 2), 16),
      g: Number.parseInt(digits.slice(2, 4), 16),
      b: Number.parseInt(digits.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (rgb) {
    const [r, g, b, a = 1] = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    return { r, g, b, a };
  }
  throw new Error(`Color no reconocido: ${input}`);
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: string): number {
  const { r, g, b, a } = parseColor(color);
  if (a !== 1)
    throw new Error(
      `El contraste no se calcula sobre colores con alfa: ${color}`,
    );
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Redondeo a dos decimales, como los ratios del handoff. */
export function formatRatio(ratio: number): string {
  return ratio.toFixed(2);
}

export function minimumFor(kind: PairKind): number {
  return kind === "text" ? AA_TEXT : AA_GRAPHIC;
}

// Superficies del tema sobre las que se lee texto (el handoff las llama bg, surface, sunken, tint).
const SURFACES = ["bg", "surface", "surface-sunken", "gold-tint"];
const WITH_HOVER = [...SURFACES, "hover"];

function themePairs(scheme: "light" | "dark"): ContrastPair[] {
  const on = (fg: string, bgs: string[], kind: PairKind = "text") =>
    bgs.map((bg) => ({ scheme, fg, bg, kind }));
  return [
    ...on("text", WITH_HOVER),
    ...on("text-secondary", SURFACES),
    ...on("text-muted", WITH_HOVER),
    ...on("on-primary", ["primary", "primary-hover"]),
    ...on("gold-700", WITH_HOVER),
    ...on("gold-800", WITH_HOVER),
    ...on("gold-600", SURFACES, "graphic"),
    ...on("border-input", SURFACES, "graphic"),
    ...on("focus-ring", SURFACES, "graphic"),
    ...on("success", [...SURFACES, "success-bg"]),
    ...on("warning", [...SURFACES, "warning-bg"]),
    ...on("error", [...SURFACES, "error-bg"]),
    ...on("info", SURFACES),
    ...on("text", ["success-bg", "warning-bg", "error-bg"]),
  ];
}

function stagePairs(): ContrastPair[] {
  const on = (
    fg: string,
    bg: string,
    kind: PairKind = "text",
  ): ContrastPair => ({
    scheme: "stage",
    fg,
    bg,
    kind,
  });
  return [
    on("count", "bg"),
    on("current", "bg"),
    on("next", "bg"),
    on("beat-inactive", "bg"),
    on("label", "bg"),
    on("secondary", "bg"),
    on("progress", "bg", "graphic"),
    on("next", "panel"),
    on("secondary", "panel"),
    on("control-border", "bg", "graphic"),
    on("on-button", "button", "graphic"),
    on("on-button", "button-hover", "graphic"),
    on("current", "warning-bg"),
    on("warning", "warning-bg", "graphic"),
  ];
}

export const CONTRAST_PAIRS: ContrastPair[] = [
  ...themePairs("light"),
  ...themePairs("dark"),
  ...stagePairs(),
];

/** Colores que nunca van como texto ni gráfico que informa (D002). */
export const DECORATIVE_ONLY: Record<ColorScheme, string[]> = {
  light: ["gold-500", "divider"],
  dark: ["gold-500", "divider"],
  stage: ["rule", "track"],
};

export function measurePair(pair: ContrastPair, tree: DesignTokens = tokens) {
  const ratio = contrastRatio(
    colorValue(pair.scheme, pair.fg, tree),
    colorValue(pair.scheme, pair.bg, tree),
  );
  return { ...pair, ratio, passes: ratio >= minimumFor(pair.kind) };
}
