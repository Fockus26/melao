import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  INDEXED_ROUTES,
  PRODUCTION_URL,
  SPLASH_BACKGROUND,
  siteUrl,
  THEME_COLOR,
} from "@/lib/seo/site";
import {
  brandImages,
  buildIco,
  FAVICON_SIZES,
  MARK,
  markSvg,
  pngSize,
  readIco,
} from "../../scripts/lib/brand-art.ts";

/** ¿Bloquea `robots.txt` esta ruta? Coincidencia por prefijo y `$` de fin, como Google. */
function blocked(path: string, disallow: string[]): boolean {
  return disallow.some((rule) =>
    rule.endsWith("$") ? path === rule.slice(0, -1) : path.startsWith(rule),
  );
}

const rules = robots().rules;
const disallow = [
  (Array.isArray(rules) ? rules[0] : rules).disallow ?? [],
].flat();

describe("siteUrl", () => {
  test("usa NEXT_PUBLIC_SITE_URL sin la barra final", () => {
    expect(siteUrl("http://localhost:4303/")).toBe("http://localhost:4303");
  });
  test("sin variable, el origen de producción", () => {
    expect(siteUrl(undefined)).toBe(PRODUCTION_URL);
    expect(siteUrl("  ")).toBe(PRODUCTION_URL);
  });
});

describe("robots.txt", () => {
  test("bloquea lo privado y las páginas de muestra", () => {
    for (const path of [
      "/app",
      "/app/practice",
      "/admin",
      "/auth/callback",
      "/welcome",
      "/checkout",
      "/spike/audio",
      "/indicators",
      "/layouts/app",
      "/primitives",
      "/stage",
      "/tokens",
    ])
      expect(blocked(path, disallow)).toBe(true);
  });

  test("deja rastrear lo público, los íconos y el manifest", () => {
    for (const path of [
      ...INDEXED_ROUTES,
      "/apple-icon.png",
      "/opengraph-image.png",
      "/favicon.ico",
      "/icons/icon-192.png",
      "/manifest.webmanifest",
    ])
      expect(blocked(path, disallow)).toBe(false);
  });

  test("apunta al sitemap del mismo origen", () => {
    expect(robots().sitemap).toBe(`${siteUrl()}/sitemap.xml`);
  });
});

describe("sitemap.xml", () => {
  test("URLs absolutas del origen, una por ruta pública", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toHaveLength(INDEXED_ROUTES.length);
    for (const url of urls) expect(url.startsWith(`${siteUrl()}`)).toBe(true);
    expect(urls).toContain(siteUrl());
    expect(urls).toContain(`${siteUrl()}/plans`);
  });

  test("ninguna ruta del sitemap está bloqueada en robots", () => {
    for (const entry of sitemap())
      expect(blocked(new URL(entry.url).pathname, disallow)).toBe(false);
  });
});

describe("manifest", () => {
  const m = manifest();

  test("abre en Inicio, instalable, colores de los tokens", () => {
    expect(m.name).toBe("Melao");
    expect(m.short_name).toBe("Melao");
    expect(m.start_url).toBe("/app");
    expect(m.display).toBe("standalone");
    expect(m.background_color).toBe(SPLASH_BACKGROUND);
    expect(m.theme_color).toBe(THEME_COLOR.light);
    expect(THEME_COLOR).toEqual({ light: "#FFFFFF", dark: "#0E0E0E" });
    expect(SPLASH_BACKGROUND).toBe("#111111");
  });

  test("íconos any y maskable que existen en disco con su tamaño", () => {
    const icons = m.icons ?? [];
    expect(icons.map((i) => i.purpose).sort()).toEqual([
      "any",
      "any",
      "maskable",
    ]);
    for (const icon of icons) {
      const file = `public${icon.src}`;
      expect(existsSync(file)).toBe(true);
      const { width, height } = pngSize(readFileSync(file));
      expect(`${width}x${height}`).toBe(icon.sizes ?? "");
    }
  });
});

describe("PNG de marca generados", () => {
  test("cada archivo existe y tiene las dimensiones que exige su plataforma", () => {
    for (const image of brandImages()) {
      expect(existsSync(image.file)).toBe(true);
      expect(pngSize(readFileSync(image.file))).toEqual({
        width: image.width,
        height: image.height,
      });
    }
  });

  test("Open Graph 1200×630 y su texto alternativo", () => {
    expect(pngSize(readFileSync("app/opengraph-image.png"))).toEqual({
      width: 1200,
      height: 630,
    });
    expect(readFileSync("app/opengraph-image.alt.txt", "utf8")).toContain(
      "Melao",
    );
  });

  test("favicon.ico trae 16, 32 y 48 como PNG", () => {
    const layers = readIco(readFileSync("app/favicon.ico"));
    expect(layers.map((l) => l.width)).toEqual([...FAVICON_SIZES]);
    for (const layer of layers)
      expect(pngSize(layer.png)).toEqual({
        width: layer.width,
        height: layer.height,
      });
  });

  test("buildIco y readIco son inversos", () => {
    const png = readFileSync("public/icons/icon-192.png");
    const [layer] = readIco(buildIco([png]));
    expect(layer.width).toBe(192);
    expect(Buffer.from(layer.png).equals(png)).toBe(true);
  });
});

describe("geometría de la M", () => {
  test("la reforzada es la de app/icon.svg y la normal la de logo.tsx (D079)", () => {
    const icon = readFileSync("app/icon.svg", "utf8");
    const r = MARK.reforzada;
    expect(icon).toContain(`d="${r.stems}"`);
    expect(icon).toContain(`d="${r.diagonal}"`);
    expect(icon).toContain(`rx="${r.radius}"`);
    const logo = readFileSync("components/layout/logo.tsx", "utf8");
    const n = MARK.normal;
    expect(logo).toContain(`d="${n.stems}"`);
    expect(logo).toContain(`d="${n.diagonal}"`);
    expect(logo).toContain(`rx="${n.radius}"`);
  });

  test("en el maskable la M cabe en la zona segura (círculo del 80 %)", () => {
    // Caja de la M normal: astas en x 14 y 34 con grosor 5, de y 13 a 35.
    const half = MARK.normal.stemWidth / 2;
    const corners = [
      [14 - half, 13],
      [34 + half, 13],
      [14 - half, 35],
      [34 + half, 35],
    ];
    const safe = 48 * 0.4;
    for (const [x, y] of corners)
      expect(Math.hypot(x - 24, y - 24)).toBeLessThan(safe);
  });

  test("apple-icon y maskable sin esquinas redondeadas; los any con radio", () => {
    const byFile = Object.fromEntries(brandImages().map((i) => [i.file, i]));
    expect(byFile["app/apple-icon.png"].html).not.toContain(" rx=");
    expect(byFile["public/icons/icon-maskable-512.png"].html).not.toContain(
      " rx=",
    );
    expect(byFile["public/icons/icon-192.png"].html).toContain(
      markSvg({
        size: 192,
        variant: "normal",
        tile: "#111111",
        ink: "#FFFFFF",
        rounded: true,
      }),
    );
  });
});
