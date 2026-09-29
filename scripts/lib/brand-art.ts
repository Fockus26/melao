/**
 * Arte de marca para `scripts/brand-assets.ts` (D087): la imagen de Open Graph, el ícono de
 * Apple, los íconos de la PWA y el favicon.ico, copiados del tablero *Marca · Open Graph e
 * íconos* del canvas (copia local: `context/plans/assets/S-SEO.dc.html`).
 * Núcleo puro (strings y buffers): lo usan el script, que lo renderiza con Playwright, y los
 * tests. Sin alias `@/`: el script corre con node, que no los resuelve.
 */

import tokens from "../../design/tokens.json" with { type: "json" };

type Scheme = "light" | "dark" | "stage";

/** Color hexadecimal de `design/tokens.json` (los que usa la marca no son alias). */
export function brandColor(scheme: Scheme, name: string): string {
  const group = tokens.color[scheme] as Record<string, { $value: unknown }>;
  const value = group[name]?.$value;
  if (typeof value !== "string" || !/^#[0-9A-F]{6}$/i.test(value))
    throw new Error(`color.${scheme}.${name} no es un hexadecimal`);
  return value;
}

export const COLORS = {
  tile: brandColor("light", "text"), // #111111: baldosa de los íconos y fondo de arranque
  onTile: brandColor("light", "bg"), // #FFFFFF
  themeLight: brandColor("light", "bg"), // #FFFFFF
  themeDark: brandColor("dark", "bg"), // #0E0E0E
  ogBg: brandColor("stage", "bg"), // #0B0B0B
  ogText: brandColor("stage", "count"), // #FFFFFF
  ogGold: brandColor("stage", "next"), // #D6B25E (8,9:1 sobre negro)
  ogRule: brandColor("stage", "rule"), // #B8913A, filetes
  ogSecondary: brandColor("stage", "secondary"), // #B3AEA4
  // El tablero apaga las cifras con #6E6E6E: mismo valor que el borde de control del escenario.
  ogDim: brandColor("stage", "control-border"),
  // Separador «·» de la cuenta: color del tablero sin token (decorativo, solo en la imagen).
  ogSeparator: "#4A4A4A",
} as const;

/**
 * Geometría de la M sobre viewBox 48 (D079). `normal` = `components/layout/logo.tsx`;
 * `reforzada` (astas 7, diagonales 5,5, radio 10) = `app/icon.svg`, para 16–48 px.
 */
export const MARK = {
  normal: {
    radius: 11,
    stems: "M14 35V13M34 35V13",
    stemWidth: 5,
    diagonal: "M15 13.5l9 15 9-15",
    diagonalWidth: 2.6,
  },
  reforzada: {
    radius: 10,
    stems: "M13 36V12M35 36V12",
    stemWidth: 7,
    diagonal: "M14 13l10 16 10-16",
    diagonalWidth: 5.5,
  },
} as const;

type MarkOptions = {
  size: number;
  variant: keyof typeof MARK;
  tile: string;
  ink: string;
  /** `false`: cuadrado lleno (apple-icon, maskable), sin esquinas transparentes. */
  rounded: boolean;
};

export function markSvg({
  size,
  variant,
  tile,
  ink,
  rounded,
}: MarkOptions): string {
  const m = MARK[variant];
  const rx = rounded ? ` rx="${m.radius}"` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">` +
    `<rect width="48" height="48"${rx} fill="${tile}"/>` +
    `<path d="${m.stems}" stroke="${ink}" stroke-width="${m.stemWidth}"/>` +
    `<path d="${m.diagonal}" fill="none" stroke="${ink}" stroke-width="${m.diagonalWidth}" stroke-miterlimit="10"/>` +
    "</svg>"
  );
}

export type BrandImage = {
  /** Ruta de salida desde la raíz del repo. */
  file: string;
  width: number;
  height: number;
  /** Fondo transparente fuera de la baldosa (esquinas redondeadas). */
  transparent: boolean;
  html: string;
};

const FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&family=Geist:wght@400;500;600&display=swap";

function page(body: string, css = ""): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}${css}</style></head><body>${body}</body></html>`;
}

// Copy provisional: titular de la landing, «Ahora · Guapea» y «Siguiente Enchufla» en la imagen
// al compartir (CONTENT_CHECKLIST fila 49). Si cambia, `bun run brand:assets` regenera el PNG.
export const OG_HEADLINE_HTML =
  "Aprende salsa con un coach que te <em>canta</em> los pasos.";
export const OG_ALT =
  "Melao. Aprende salsa con un coach que te canta los pasos. Cuenta 1 2 3, 5 6 7 con el 5 marcado; siguiente paso: Enchufla.";

/** Open Graph 1200 × 630, tal cual el tablero (márgenes 72 × 80, zona segura). */
export function ogHtml(): string {
  const c = COLORS;
  const digit = (d: string) => `<span style="color:${c.ogDim}">${d}</span>`;
  const dot = `<span style="color:${c.ogSeparator}">·</span>`;
  const mark = markSvg({
    size: 56,
    variant: "normal",
    tile: c.ogText,
    ink: c.ogBg,
    rounded: true,
  });
  const css = `
body{font-family:'Geist',system-ui,sans-serif}
p{margin:0}
.serif{font-family:'Fraunces',Georgia,serif}
.og{width:1200px;height:630px;box-sizing:border-box;padding:72px 80px;background:${c.ogBg};color:${c.ogText};display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}
.top{display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:16px}
.wordmark{font-size:40px;line-height:48px;font-weight:500;letter-spacing:-0.01em}
.eyebrow{font-size:18px;line-height:24px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;color:${c.ogGold}}
.headline{font-size:64px;line-height:70px;letter-spacing:-0.02em;font-weight:400;max-width:940px}
.headline em{font-style:italic}
.bottom{display:flex;align-items:flex-end;gap:40px;padding-top:24px;border-top:1px solid ${c.ogRule}}
.col{display:flex;flex-direction:column;gap:8px}
.now{font-size:18px;line-height:24px;color:${c.ogSecondary}}
.now b{color:${c.ogText};font-weight:500}
.count{display:flex;gap:28px;font-size:48px;line-height:56px;font-variant-numeric:tabular-nums}
.beat{color:${c.ogText};font-weight:600;text-decoration:underline;text-decoration-color:${c.ogGold};text-decoration-thickness:3px;text-underline-offset:12px}
.divider{width:1px;height:88px;background:${c.ogRule}}
.label{font-size:18px;line-height:24px;letter-spacing:0.14em;text-transform:uppercase;color:${c.ogSecondary}}
.next{font-size:56px;line-height:56px;font-weight:500;color:${c.ogGold}}`;
  const body = `<div class="og">
<div class="top"><div class="brand">${mark}<span class="serif wordmark">Melao</span></div><span class="eyebrow">Salsa casino · Merengue</span></div>
<p class="serif headline">${OG_HEADLINE_HTML}</p>
<div class="bottom">
<div class="col"><span class="now">Ahora · <b>Guapea</b></span><div class="count">${digit("1")}${digit("2")}${digit("3")}${dot}<span class="beat">5</span>${digit("6")}${digit("7")}${dot}</div></div>
<div class="divider"></div>
<div class="col"><span class="label">Siguiente</span><span class="serif next">Enchufla</span></div>
</div>
</div>`;
  // @import al principio del <style>: el script espera `document.fonts.ready` antes de capturar.
  return page(body, `@import url('${FONTS_CSS}');${css}`);
}

function icon(
  file: string,
  size: number,
  variant: keyof typeof MARK,
  rounded: boolean,
): BrandImage {
  return {
    file,
    width: size,
    height: size,
    transparent: rounded,
    html: page(
      markSvg({
        size,
        variant,
        tile: COLORS.tile,
        ink: COLORS.onTile,
        rounded,
      }),
    ),
  };
}

export const OG_FILES = ["app/opengraph-image.png", "app/twitter-image.png"];

/** Todo lo que escribe el script, con el tamaño que exige cada plataforma. */
export function brandImages(): BrandImage[] {
  return [
    ...OG_FILES.map((file) => ({
      file,
      width: 1200,
      height: 630,
      transparent: false,
      html: ogHtml(),
    })),
    // iOS pone su propia máscara: cuadrado lleno, sin transparencia.
    icon("app/apple-icon.png", 180, "normal", false),
    icon("public/icons/icon-192.png", 192, "normal", true),
    icon("public/icons/icon-512.png", 512, "normal", true),
    // Android recorta con su máscara: fondo lleno; la M cabe en el círculo del 80 %.
    icon("public/icons/icon-maskable-512.png", 512, "normal", false),
  ];
}

/** Capas del favicon.ico: la M reforzada, que se lee a 16 px. */
export const FAVICON_SIZES = [16, 32, 48] as const;

export function faviconLayers(): BrandImage[] {
  return FAVICON_SIZES.map((size) =>
    icon(`favicon-${size}.png`, size, "reforzada", true),
  );
}

/** Ancho y alto de un PNG, de la cabecera IHDR (bytes 16–23). */
export function pngSize(png: Uint8Array): { width: number; height: number } {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!signature.every((b, i) => png[i] === b)) throw new Error("No es un PNG");
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/**
 * ICO con PNG embebidos (Vista+): cabecera de 6 bytes, una entrada de 16 bytes por imagen y
 * los PNG uno detrás de otro. Ancho/alto 0 significa 256.
 */
export function buildIco(pngs: Uint8Array[]): Uint8Array {
  const header = 6;
  const entry = 16;
  const total =
    header + entry * pngs.length + pngs.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true); // reservado
  view.setUint16(2, 1, true); // tipo 1 = ícono
  view.setUint16(4, pngs.length, true);
  let offset = header + entry * pngs.length;
  pngs.forEach((png, i) => {
    const { width, height } = pngSize(png);
    const at = header + entry * i;
    view.setUint8(at, width >= 256 ? 0 : width);
    view.setUint8(at + 1, height >= 256 ? 0 : height);
    view.setUint8(at + 2, 0); // sin paleta
    view.setUint8(at + 3, 0);
    view.setUint16(at + 4, 1, true); // planos
    view.setUint16(at + 6, 32, true); // bits por píxel
    view.setUint32(at + 8, png.length, true);
    view.setUint32(at + 12, offset, true);
    out.set(png, offset);
    offset += png.length;
  });
  return out;
}

/** Entradas de un ICO (para los tests): tamaño y el PNG de cada capa. */
export function readIco(
  ico: Uint8Array,
): { width: number; height: number; png: Uint8Array }[] {
  const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);
  if (view.getUint16(0, true) !== 0 || view.getUint16(2, true) !== 1)
    throw new Error("No es un ICO");
  return Array.from({ length: view.getUint16(4, true) }, (_, i) => {
    const at = 6 + 16 * i;
    const length = view.getUint32(at + 8, true);
    const offset = view.getUint32(at + 12, true);
    return {
      width: view.getUint8(at) || 256,
      height: view.getUint8(at + 1) || 256,
      png: ico.subarray(offset, offset + length),
    };
  });
}
