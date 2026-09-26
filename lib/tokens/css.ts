/**
 * `design/tokens.json` → `app/tokens.css` (D018, D033). Generador propio en lugar de Style
 * Dictionary: la salida es `@theme` de Tailwind v4 + overrides de `.dark` + utilidades, y eso
 * pedía un formato a medida igual de largo que este archivo.
 *
 * Qué emite:
 * - `@theme static` con todo (se emite aunque ninguna clase lo use: `/tokens` y los componentes
 *   leen las variables directamente). Los namespaces de color, tamaño de texto, radio, sombra y
 *   curva se vacían antes (`--color-*: initial`) para que no quede ningún valor de Tailwind
 *   fuera del sistema.
 * - Colores del tema claro como valor base y `.dark` que los sobrescribe con los mismos nombres.
 *   `color.stage` va como `--color-stage-*` y no aparece en `.dark`: el escenario es igual en
 *   los dos temas (D007).
 * - Alias que espera shadcn/ui (`--background`, `--primary`, `--ring`, `--radius`…) apuntando a
 *   los tokens semánticos (D006), para que `shadcn init` no invente valores.
 * - Utilidades por rol tipográfico `type-<rol>` (familia, tamaño, interlineado, peso, tracking,
 *   mayúsculas y cifras tabulares), `duration-<token>` y `z-<token>` (D035).
 */

import {
  type DesignTokens,
  tokens as defaultTokens,
  listGroup,
  motionCss,
  shadowCss,
  type TypographyValue,
} from "./model";

/** Variables que `next/font` declara en `<html>` (ver `app/fonts.ts`). */
export const FONT_VARIABLES: Record<string, string> = {
  Fraunces: "--font-fraunces",
  Geist: "--font-geist",
};

/** Familia del token → utilidad de familia de Tailwind. */
const FAMILY_ROLE: Record<string, "serif" | "sans"> = {
  Fraunces: "serif",
  Geist: "sans",
};

/** Roles con cifras que cambian: siempre tabulares, lo diga o no el JSON (HANDOFF §1.3). */
const TABULAR_PREFIXES = ["numeric-", "stage-"];

/** Alias de shadcn/ui → token semántico (`--color-<nombre>`). */
export const SHADCN_ALIASES: Record<string, string> = {
  background: "bg",
  foreground: "text",
  card: "surface",
  "card-foreground": "text",
  popover: "surface",
  "popover-foreground": "text",
  primary: "primary",
  "primary-foreground": "on-primary",
  secondary: "surface-sunken",
  "secondary-foreground": "text",
  muted: "surface-sunken",
  "muted-foreground": "text-muted",
  accent: "hover",
  "accent-foreground": "text",
  destructive: "error",
  border: "divider",
  input: "border-input",
  ring: "focus-ring",
};

export const GENERATED_HEADER =
  "/* GENERADO por scripts/tokens.ts desde design/tokens.json — no editar a mano.\n   Regenerar con `bun run tokens`; un test falla si este archivo y el JSON divergen. */";

function block(selector: string, lines: string[]): string {
  return `${selector} {\n${lines.map((l) => `  ${l}`).join("\n")}\n}`;
}

function fontStack(family: string[]): string {
  const [first, ...fallbacks] = family;
  const variable = FONT_VARIABLES[first];
  const head = variable ? `var(${variable})` : `"${first}"`;
  return [head, ...fallbacks].join(", ");
}

function typographyFamilies(
  tree: DesignTokens,
): Map<"serif" | "sans", string[]> {
  const families = new Map<"serif" | "sans", string[]>();
  for (const { value } of listGroup(tree.typography, tree)) {
    const role = FAMILY_ROLE[value.fontFamily[0]];
    if (!role)
      throw new Error(`Familia sin rol en FAMILY_ROLE: ${value.fontFamily[0]}`);
    if (!families.has(role)) families.set(role, value.fontFamily);
  }
  return families;
}

export function isTabular(name: string, value: TypographyValue): boolean {
  return (
    value.fontVariantNumeric === "tabular-nums" ||
    TABULAR_PREFIXES.some((prefix) => name.startsWith(prefix))
  );
}

export function generateTokensCss(tree: DesignTokens = defaultTokens): string {
  const light = listGroup(tree.color.light, tree);
  const dark = listGroup(tree.color.dark, tree);
  const stage = listGroup(tree.color.stage, tree);
  const typography = listGroup(tree.typography, tree);

  const lightNames = light.map((t) => t.name).join();
  if (dark.map((t) => t.name).join() !== lightNames) {
    throw new Error(
      "color.light y color.dark deben tener los mismos tokens en el mismo orden",
    );
  }

  const theme: string[] = [
    "/* Color: tema claro como base; .dark lo sobrescribe más abajo */",
    "--color-*: initial;",
    ...light.map((t) => `--color-${t.name}: ${t.value};`),
    "",
    "/* Color: escenario, idéntico en claro y oscuro (D007) */",
    ...stage.map((t) => `--color-stage-${t.name}: ${t.value};`),
    "",
    "/* Familias (next/font declara las variables en <html>) */",
    ...[...typographyFamilies(tree)].map(
      ([role, family]) => `--font-${role}: ${fontStack(family)};`,
    ),
    "",
    "/* Tipografía por rol: text-<rol> (tamaño, interlineado, peso, tracking) */",
    "--text-*: initial;",
    ...typography.flatMap(({ name, value }) => [
      `--text-${name}: ${value.fontSize};`,
      `--text-${name}--line-height: ${value.lineHeight};`,
      `--text-${name}--letter-spacing: ${value.letterSpacing};`,
      `--text-${name}--font-weight: ${value.fontWeight};`,
    ]),
    "",
    "/* Espaciado: base de 4 px (p-4 = 16 px) y cada token con nombre */",
    "--spacing: 4px;",
    ...listGroup(tree.spacing, tree).map(
      (t) => `--spacing-${t.name}: ${t.value};`,
    ),
    "",
    "--radius-*: initial;",
    ...listGroup(tree.radius, tree).map(
      (t) => `--radius-${t.name}: ${t.value};`,
    ),
    "",
    "--shadow-*: initial;",
    ...listGroup(tree.shadow, tree).map(
      (t) => `--shadow-${t.name}: ${shadowCss(t.value)};`,
    ),
    "",
    "/* Movimiento */",
    "--ease-*: initial;",
    ...listGroup(tree.motion, tree).map(
      (t) => `--${t.name}: ${motionCss(t.value)};`,
    ),
    "",
    "/* z-index */",
    ...listGroup(tree.zIndex, tree).map((t) => `--z-${t.name}: ${t.value};`),
  ];

  const darkBlock = block(".dark", [
    "color-scheme: dark;",
    ...dark.map((t) => `--color-${t.name}: ${t.value};`),
  ]);

  const rootBlock = block(":root", [
    "color-scheme: light;",
    "",
    "/* Alias para shadcn/ui (D006): apuntan a los tokens, nunca a valores sueltos */",
    ...Object.entries(SHADCN_ALIASES).map(
      ([alias, token]) => `--${alias}: var(--color-${token});`,
    ),
    "--radius: var(--radius-md);",
  ]);

  const typeUtilities = typography.map(({ name, value }) => {
    const lines = [
      `font-family: var(--font-${FAMILY_ROLE[value.fontFamily[0]]});`,
      `font-size: var(--text-${name});`,
      `line-height: var(--text-${name}--line-height);`,
      `font-weight: var(--text-${name}--font-weight);`,
      `letter-spacing: var(--text-${name}--letter-spacing);`,
    ];
    if (value.textTransform)
      lines.push(`text-transform: ${value.textTransform};`);
    if (isTabular(name, value))
      lines.push("font-variant-numeric: tabular-nums;");
    return block(`@utility type-${name}`, lines);
  });

  const durationUtilities = listGroup(tree.motion, tree)
    .filter((t) => t.name.startsWith("duration-"))
    .map((t) =>
      block(`@utility ${t.name}`, [`transition-duration: var(--${t.name});`]),
    );

  const zUtilities = listGroup(tree.zIndex, tree).map((t) =>
    block(`@utility z-${t.name}`, [`z-index: var(--z-${t.name});`]),
  );

  // Las utilidades generadas existen siempre, aunque solo se usen con nombres dinámicos.
  const utilityNames = [
    ...typography.map((t) => `type-${t.name}`),
    ...listGroup(tree.motion, tree)
      .filter((t) => t.name.startsWith("duration-"))
      .map((t) => t.name),
    ...listGroup(tree.zIndex, tree).map((t) => `z-${t.name}`),
  ];

  return [
    GENERATED_HEADER,
    "",
    "@custom-variant dark (&:where(.dark, .dark *));",
    `@source inline("${utilityNames.join(" ")}");`,
    "",
    block("@theme static", theme).replace(/^ {2}$/gm, ""),
    "",
    rootBlock.replace(/^ {2}$/gm, ""),
    "",
    darkBlock,
    "",
    "/* Tipografía completa por rol: type-<rol> */",
    typeUtilities.join("\n\n"),
    "",
    durationUtilities.join("\n\n"),
    "",
    zUtilities.join("\n\n"),
    "",
  ].join("\n");
}
