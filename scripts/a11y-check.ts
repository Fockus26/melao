/**
 * axe-core (WCAG 2.1 A/AA) sobre rutas del servidor de desarrollo, en tema claro y oscuro.
 *
 * Uso (con **node**, no con bun: en Windows Playwright bajo Bun se cuelga al lanzar Chromium):
 *   BASE_URL=http://localhost:3000 node scripts/a11y-check.ts /primitivos /tokens
 *
 * El tema se fuerza con la misma clave de localStorage que usa la app (`melao-theme`, D034).
 * Sale con código 1 si hay alguna violación.
 */

import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ROUTES = process.argv.slice(2);
if (ROUTES.length === 0) ROUTES.push("/");

const browser = await chromium.launch();
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
