/**
 * PNG de marca reproducibles (D087): Open Graph + tarjeta de X, ícono de Apple, íconos de la
 * PWA y favicon.ico (más el texto alternativo de Open Graph), renderizados con Chromium desde `scripts/lib/brand-art.ts`.
 *
 * Uso (con **node**, no con bun: Playwright bajo Bun se cuelga en Windows, D071):
 *   node scripts/brand-assets.ts   (= bun run brand:assets)
 *
 * Necesita red: la imagen de Open Graph carga Fraunces y Geist de Google Fonts (la variable
 * con tamaño óptico, igual que `next/font`). Si una fuente no carga, el script falla en vez
 * de escribir un PNG con la tipografía de respaldo. Los archivos se commitean.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  type BrandImage,
  brandImages,
  buildIco,
  faviconLayers,
  OG_ALT,
  OG_FILES,
  pngSize,
} from "./lib/brand-art.ts";
import { BROWSER_HINT, prepareBrowsersPath } from "./lib/windows-env.ts";

prepareBrowsersPath();
const { chromium } = await import("@playwright/test");

const browser = await chromium
  .launch({ args: ["--disable-gpu"] })
  .catch((error: Error) => {
    console.error(`${error.message.split("\n")[0]}\n${BROWSER_HINT}`);
    process.exit(1);
  });

const FONTS = [
  "400 64px Fraunces",
  "italic 400 64px Fraunces",
  "500 40px Fraunces",
  "400 18px Geist",
  "600 18px Geist",
];

async function render(image: BrandImage): Promise<Uint8Array> {
  const context = await browser.newContext({
    viewport: { width: image.width, height: image.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.setContent(image.html, { waitUntil: "networkidle" });
  if (image.html.includes("fonts.googleapis.com")) {
    const missing = await page.evaluate(async (fonts) => {
      await Promise.all(fonts.map((f) => document.fonts.load(f)));
      await document.fonts.ready;
      return fonts.filter((f) => !document.fonts.check(f));
    }, FONTS);
    if (missing.length)
      throw new Error(`No cargaron las fuentes: ${missing.join(", ")}`);
  }
  const png = await page.screenshot({
    clip: { x: 0, y: 0, width: image.width, height: image.height },
    omitBackground: image.transparent,
  });
  await context.close();
  const size = pngSize(png);
  if (size.width !== image.width || size.height !== image.height)
    throw new Error(
      `${image.file}: ${size.width}×${size.height}, se esperaba ${image.width}×${image.height}`,
    );
  return png;
}

async function write(file: string, data: Uint8Array) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, data);
  console.log(`${file}  ${(data.length / 1024).toFixed(1)} KB`);
}

try {
  // Open Graph y la tarjeta de X son el mismo arte: se renderiza una vez.
  const rendered = new Map<string, Uint8Array>();
  for (const image of brandImages()) {
    const png = rendered.get(image.html) ?? (await render(image));
    rendered.set(image.html, png);
    await write(image.file, png);
  }
  // Texto alternativo de la imagen al compartir, junto a cada PNG (convención de Next).
  for (const file of OG_FILES)
    await write(
      file.replace(/\.png$/, ".alt.txt"),
      new TextEncoder().encode(OG_ALT),
    );
  const layers: Uint8Array[] = [];
  for (const layer of faviconLayers()) layers.push(await render(layer));
  await write("app/favicon.ico", buildIco(layers));
} finally {
  await browser.close();
}
