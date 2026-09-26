/**
 * Lectura de `design/tokens.json` (W3C Design Tokens). Núcleo puro: lo usan el generador de CSS
 * (`scripts/tokens.ts`), la página de referencia `/tokens` y los tests. Sin dependencias de
 * Next ni del DOM.
 */

import rawTokens from "@/design/tokens.json";

export type ColorScheme = "light" | "dark" | "stage";

export interface TypographyValue {
  fontFamily: string[];
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing: string;
  textTransform?: string;
  fontVariantNumeric?: string;
}

export interface ShadowValue {
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string;
}

interface Token<V> {
  $value: V;
  $type: string;
  $description?: string;
}

type Group<V> = Record<string, Token<V>>;

export interface DesignTokens {
  color: Record<ColorScheme, Group<string>>;
  typography: Group<TypographyValue>;
  spacing: Group<string>;
  radius: Group<string>;
  shadow: Group<ShadowValue>;
  motion: Group<string | number[]>;
  zIndex: Group<number>;
}

export const tokens = rawTokens as unknown as DesignTokens;

export interface NamedToken<V> {
  name: string;
  value: V;
  description?: string;
}

const ALIAS = /^\{([^}]+)\}$/;

/**
 * Resuelve un alias `{grupo.sub.token}` contra el árbol completo, en cadena y con detección de
 * ciclos. Un valor que no es alias se devuelve tal cual.
 */
export function resolveValue<V>(
  value: V,
  tree: object,
  seen: string[] = [],
): V {
  if (typeof value !== "string") return value;
  const match = ALIAS.exec(value);
  if (!match) return value;
  const path = match[1];
  if (seen.includes(path)) {
    throw new Error(`Alias circular en tokens: ${[...seen, path].join(" → ")}`);
  }
  let node: unknown = tree;
  for (const key of path.split(".")) {
    if (node === null || typeof node !== "object" || !(key in node)) {
      throw new Error(`Alias sin destino en tokens: {${path}}`);
    }
    node = (node as Record<string, unknown>)[key];
  }
  const target = node as Token<V> | undefined;
  if (!target || !("$value" in target)) {
    throw new Error(`Alias que no apunta a un token: {${path}}`);
  }
  return resolveValue(target.$value, tree, [...seen, path]);
}

/** Lista ordenada (orden del JSON) de los tokens de un grupo, con alias resueltos. */
export function listGroup<V>(
  group: Group<V>,
  tree: object = tokens,
): NamedToken<V>[] {
  return Object.entries(group)
    .filter(([name]) => !name.startsWith("$"))
    .map(([name, token]) => ({
      name,
      value: resolveValue(token.$value, tree),
      description: token.$description,
    }));
}

export function colors(
  scheme: ColorScheme,
  tree: DesignTokens = tokens,
): NamedToken<string>[] {
  return listGroup(tree.color[scheme], tree);
}

/** Devuelve el valor de un color por nombre; lanza si no existe (los pares se validan así). */
export function colorValue(
  scheme: ColorScheme,
  name: string,
  tree: DesignTokens = tokens,
): string {
  const token = tree.color[scheme][name];
  if (!token) throw new Error(`Color inexistente: color.${scheme}.${name}`);
  return resolveValue(token.$value, tree);
}

/** `[0.2, 0, 0, 1]` → `cubic-bezier(0.2, 0, 0, 1)`; duraciones pasan tal cual. */
export function motionCss(value: string | number[]): string {
  return Array.isArray(value) ? `cubic-bezier(${value.join(", ")})` : value;
}

export function shadowCss(value: ShadowValue): string {
  return `${value.offsetX} ${value.offsetY} ${value.blur} ${value.spread} ${value.color}`;
}
