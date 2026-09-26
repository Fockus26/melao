import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  AA_GRAPHIC,
  AA_TEXT,
  CONTRAST_PAIRS,
  contrastRatio,
  DECORATIVE_ONLY,
  measurePair,
} from "@/lib/tokens/contrast";
import { generateTokensCss, SHADCN_ALIASES } from "@/lib/tokens/css";
import {
  colors,
  colorValue,
  type DesignTokens,
  listGroup,
  resolveValue,
  tokens,
} from "@/lib/tokens/model";

const ROOT = resolve(import.meta.dir, "../..");

describe("generación de app/tokens.css", () => {
  test("el CSS commiteado está al día con design/tokens.json", () => {
    const committed = readFileSync(
      join(ROOT, "app/tokens.css"),
      "utf8",
    ).replace(/\r\n/g, "\n");
    // Si falla: `bun run tokens` y commitear los dos archivos juntos.
    expect(committed).toBe(generateTokensCss());
  });

  const css = generateTokensCss();
  const darkBlock = css.slice(
    css.indexOf(".dark {"),
    css.indexOf("}", css.indexOf(".dark {")),
  );

  test("cada color claro está en @theme y cada color oscuro en .dark, con el mismo nombre", () => {
    for (const { name, value } of colors("light")) {
      expect(css).toContain(`--color-${name}: ${value};`);
    }
    for (const { name, value } of colors("dark")) {
      expect(darkBlock).toContain(`--color-${name}: ${value};`);
    }
  });

  test("el escenario va aparte y nunca dentro de .dark (igual en los dos temas)", () => {
    for (const { name, value } of colors("stage")) {
      expect(css).toContain(`--color-stage-${name}: ${value};`);
    }
    expect(darkBlock).not.toContain("--color-stage-");
  });

  test("cada rol tipográfico tiene text-<rol> y type-<rol>", () => {
    for (const { name, value } of listGroup(tokens.typography)) {
      expect(css).toContain(`--text-${name}: ${value.fontSize};`);
      expect(css).toContain(
        `--text-${name}--line-height: ${value.lineHeight};`,
      );
      expect(css).toContain(`@utility type-${name} {`);
    }
  });

  test("numeric-* y stage-* llevan cifras tabulares", () => {
    for (const { name } of listGroup(tokens.typography)) {
      if (!/^(numeric|stage)-/.test(name)) continue;
      const start = css.indexOf(`@utility type-${name} {`);
      const rule = css.slice(start, css.indexOf("}", start));
      expect(rule).toContain("font-variant-numeric: tabular-nums;");
    }
  });

  test("espaciado, radios, sombras, movimiento y z-index salen del JSON", () => {
    for (const { name, value } of listGroup(tokens.spacing)) {
      expect(css).toContain(`--spacing-${name}: ${value};`);
      // La base de 4 px de Tailwind coincide con cada token (n × 4 px).
      expect(Number.parseFloat(value)).toBe(Number(name) * 4);
    }
    for (const { name } of listGroup(tokens.radius))
      expect(css).toContain(`--radius-${name}:`);
    for (const { name } of listGroup(tokens.shadow))
      expect(css).toContain(`--shadow-${name}:`);
    for (const { name } of listGroup(tokens.motion))
      expect(css).toContain(`--${name}:`);
    for (const { name } of listGroup(tokens.zIndex))
      expect(css).toContain(`--z-${name}:`);
    expect(css).toContain("--ease-standard: cubic-bezier(0.2, 0, 0, 1);");
  });

  test("los alias de shadcn apuntan a tokens existentes", () => {
    const names = new Set(colors("light").map((t) => t.name));
    for (const [alias, token] of Object.entries(SHADCN_ALIASES)) {
      expect(names.has(token)).toBe(true);
      expect(css).toContain(`--${alias}: var(--color-${token});`);
    }
  });

  test("ningún var() del CSS generado apunta a una variable inexistente", () => {
    const declared = new Set(
      [...css.matchAll(/(--[\w-]+):/g)].map((m) => m[1]),
    );
    // Las declara next/font en <html>.
    declared.add("--font-fraunces");
    declared.add("--font-geist");
    for (const [, used] of css.matchAll(/var\((--[\w-]+)\)/g)) {
      expect(declared.has(used)).toBe(true);
    }
  });
});

describe("alias de tokens", () => {
  test("gold-800 resuelve a gold-700 (D024)", () => {
    expect(colorValue("light", "gold-800")).toBe(
      colorValue("light", "gold-700"),
    );
    expect(colorValue("light", "gold-800")).toBe("#80621C");
  });

  test("resuelve alias en cadena", () => {
    const tree = {
      a: { $value: "{b}", $type: "color" },
      b: { $value: "{c}", $type: "color" },
      c: { $value: "#000000", $type: "color" },
    };
    expect(resolveValue("{a}", tree)).toBe("#000000");
  });

  test("falla con alias circular o sin destino", () => {
    const tree = {
      a: { $value: "{b}", $type: "color" },
      b: { $value: "{a}", $type: "color" },
    };
    expect(() => resolveValue("{a}", tree)).toThrow(/circular/);
    expect(() => resolveValue("{nada.aqui}", tree)).toThrow(/sin destino/);
  });

  test("ningún valor del JSON queda como alias sin resolver", () => {
    const tree = tokens as DesignTokens;
    for (const scheme of ["light", "dark", "stage"] as const) {
      for (const { value } of colors(scheme, tree))
        expect(value).not.toMatch(/[{}]/);
    }
  });
});

describe("contraste WCAG 2.1 AA de los pares del handoff", () => {
  test("la fórmula coincide con los ratios de referencia", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#B8913A", "#FFFFFF")).toBeCloseTo(2.94, 2);
    expect(contrastRatio("#111111", "#FFFFFF")).toBeCloseTo(18.88, 2);
  });

  for (const pair of CONTRAST_PAIRS) {
    const min = pair.kind === "text" ? AA_TEXT : AA_GRAPHIC;
    test(`${pair.scheme}: ${pair.fg} sobre ${pair.bg} ≥ ${min}:1`, () => {
      expect(measurePair(pair).ratio).toBeGreaterThanOrEqual(min);
    });
  }

  test("los colores decorativos nunca aparecen como primer plano de un par", () => {
    for (const pair of CONTRAST_PAIRS) {
      expect(DECORATIVE_ONLY[pair.scheme]).not.toContain(pair.fg);
    }
  });

  test("gold-500 y el filete del escenario no se usan como texto en el código", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(tsx?|css)$/.test(entry) && !path.endsWith("tokens.css")) {
          if (
            /\btext-(gold-500|stage-rule)\b/.test(readFileSync(path, "utf8"))
          ) {
            offenders.push(path);
          }
        }
      }
    };
    for (const dir of ["app", "components"]) {
      try {
        walk(join(ROOT, dir));
      } catch {
        // la carpeta puede no existir todavía
      }
    }
    expect(offenders).toEqual([]);
  });
});
