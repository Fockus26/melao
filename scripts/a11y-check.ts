/**
 * axe-core (WCAG 2.1 A/AA) sobre rutas del servidor de desarrollo, en tema claro y oscuro.
 *
 * Uso (con **node**, no con bun: en Windows Playwright bajo Bun se cuelga al lanzar Chromium):
 *   BASE_URL=http://localhost:3000 node scripts/a11y-check.ts /primitives /tokens
 *   (= bun run a11y /primitives /tokens; en PowerShell: $env:BASE_URL="http://localhost:3000")
 *
 * Funciona igual desde Git Bash y PowerShell (ver `scripts/lib/windows-env.ts`):
 *   - Las rutas pueden ir con o sin `/` inicial; las que MSYS convirtió en ruta de Windows
 *     (`/indicators` → `C:/Program Files/Git/indicators`) se recuperan.
 *   - Si Chromium no está en `%LOCALAPPDATA%\ms-playwright` (se instaló desde una app MSIX
 *     como Claude Desktop), se busca en la copia virtualizada y se fija PLAYWRIGHT_BROWSERS_PATH.
 *
 * El tema se fuerza con la misma clave de localStorage que usa la app (`melao-theme`, D034).
 * Sale con código 1 si hay alguna violación.
 */

import {
  BROWSER_HINT,
  msysRoots,
  normalizeRoute,
  prepareBrowsersPath,
} from "./lib/windows-env.ts";

// Antes de importar Playwright: lee la carpeta de navegadores al cargar.
prepareBrowsersPath();
const { default: AxeBuilder } = await import("@axe-core/playwright");
const { chromium } = await import("@playwright/test");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const roots = msysRoots(process.env);
const ROUTES = process.argv.slice(2).map((arg) => normalizeRoute(arg, roots));
if (ROUTES.length === 0) ROUTES.push("/");

const browser = await chromium.launch().catch((error: Error) => {
  console.error(`${error.message.split("\n")[0]}\n${BROWSER_HINT}`);
  process.exit(1);
});
let failed = false;

for (const scheme of ["light", "dark"] as const) {
  const context = await browser.newContext({ colorScheme: scheme });
  await context.addInitScript((value) => {
    try {
      localStorage.setItem("melao-theme", value);
    } catch {}
  }, scheme);
  for (const route of ROUTES) {
    const page = await context.newPage();
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    console.log(`${route} (${scheme}): ${violations.length} violaciones`);
    for (const v of violations) {
      failed = true;
      console.log(`  [${v.impact}] ${v.id} — ${v.help}`);
      for (const node of v.nodes) console.log(`    → ${node.target.join(" ")}`);
    }
    await page.close();
  }
  await context.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
