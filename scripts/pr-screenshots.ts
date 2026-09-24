/**
 * Capturas para el PR — genera PNG de los estados que cambió la unidad.
 *
 * Uso (con **node**, no con bun — ver la nota de abajo):
 *   node scripts/pr-screenshots.ts .pr-shots.json   (= bun run shots)   # Node ≥ 23.6 (o 22.x con --experimental-strip-types)
 *   → escribe .pr-shots/<nombre>[-light|-dark].png y lista las rutas.
 *   Después: bun run shots:publish   (= bash scripts/publish-pr-shots.sh .pr-shots)
 *
 * `.pr-shots.json` lo escribe el agente para su unidad (y va en .gitignore):
 *
 *   {
 *     "base": "http://localhost:3000",
 *     "shots": [
 *       { "name": "ranking-movil", "path": "/", "width": 375, "height": 812, "scheme": "both",
 *         "storage": { "tutorial-seen": "1" },
 *         "steps": [ { "click": "role=button[name='Ver ranking']" },
 *                    { "waitFor": "role=dialog" } ],
 *         "element": "role=dialog" },
 *       { "name": "home-escritorio", "path": "/", "width": 1280, "height": 800 }
 *     ]
 *   }
 *
 * Campos de cada captura:
 *   width/height   viewport (por defecto 1280×800)
 *   scheme         "light" | "dark" | "both" (por defecto "light")
 *   storage        claves de localStorage sembradas antes de cargar (para llegar a un estado)
 *   steps          click | fill+value | press | waitFor | wait (ms) | eval (JS en la página)
 *   element        captura solo ese elemento (más nítida y más liviana que la página)
 *   fullPage       página entera en vez del viewport
 *
 * Decisiones que evitan capturas malas o que se cuelgan:
 *   - Service workers bloqueados: nunca se captura un bundle viejo de caché.
 *   - `reducedMotion: 'reduce'`: sin fotos a mitad de una animación.
 *   - Timeout por paso y un reintento por captura; si aun así falla, se sigue con las
 *     demás y se informa al final (una captura que falla no bloquea el PR).
 *
 * **Por qué node y no bun:** en Windows, Playwright lanzado desde un script de Bun se queda
 * colgado al arrancar Chromium (se comprobó: 170 s sin salida con bun; 3 capturas en
 * segundos con node, mismo script). Aplica a todo script que importe Playwright. Los
 * scripts de `package.json` (`bun run test:e2e` → `playwright test`) no tienen el
 * problema: el binario de Playwright se ejecuta con node por su shebang.
 *
 * El agente **no abre las imágenes** para revisarlas (cuestan muchos tokens): la
 * verificación ya la hizo midiendo el DOM. Las capturas son para quien revisa el PR.
 */

import { mkdir, readFile } from "node:fs/promises";
import { chromium, type Page } from "@playwright/test";

type Step =
  | { click: string }
  | { fill: string; value: string }
  | { press: string }
  | { waitFor: string }
  | { wait: number }
  | { eval: string };

type Shot = {
  name: string;
  path?: string;
  width?: number;
  height?: number;
  scheme?: "light" | "dark" | "both";
  storage?: Record<string, string>;
  steps?: Step[];
  element?: string;
  fullPage?: boolean;
};

const configPath = process.argv[2] ?? ".pr-shots.json";
const OUT = ".pr-shots";
const STEP_TIMEOUT = 10_000;

const config = JSON.parse(await readFile(configPath, "utf8")) as {
  base: string;
  shots: Shot[];
};
await mkdir(OUT, { recursive: true });

async function runSteps(page: Page, steps: Step[]) {
  for (const step of steps) {
    if ("click" in step)
      await page.locator(step.click).first().click({ timeout: STEP_TIMEOUT });
    else if ("fill" in step)
      await page
        .locator(step.fill)
        .first()
        .fill(step.value, { timeout: STEP_TIMEOUT });
    else if ("press" in step) await page.keyboard.press(step.press);
    else if ("waitFor" in step)
      await page
        .locator(step.waitFor)
        .first()
        .waitFor({ timeout: STEP_TIMEOUT });
    else if ("wait" in step) await page.waitForTimeout(step.wait);
    else if ("eval" in step) await page.evaluate(step.eval);
  }
}

const browser = await chromium.launch({ args: ["--disable-gpu"] });
const written: string[] = [];
const failed: string[] = [];

for (const shot of config.shots) {
  const schemes =
    shot.scheme === "both"
      ? (["light", "dark"] as const)
      : ([shot.scheme ?? "light"] as const);

  for (const scheme of schemes) {
    const file = `${OUT}/${shot.name}${shot.scheme === "both" ? `-${scheme}` : ""}.png`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const context = await browser.newContext({
        viewport: { width: shot.width ?? 1280, height: shot.height ?? 800 },
        colorScheme: scheme,
        reducedMotion: "reduce",
        serviceWorkers: "block",
        deviceScaleFactor: 1,
      });
      if (shot.storage) {
        await context.addInitScript((entries: Record<string, string>) => {
          for (const [k, v] of Object.entries(entries))
            localStorage.setItem(k, v);
        }, shot.storage);
      }
      const page = await context.newPage();
      try {
        await page.goto(config.base + (shot.path ?? "/"), {
          waitUntil: "load",
          timeout: 30_000,
        });
        await runSteps(page, shot.steps ?? []);
        if (shot.element) {
          await page
            .locator(shot.element)
            .first()
            .screenshot({ path: file, timeout: STEP_TIMEOUT });
        } else {
          await page.screenshot({
            path: file,
            fullPage: shot.fullPage ?? false,
            timeout: STEP_TIMEOUT,
          });
        }
        written.push(file);
        await context.close();
        break;
      } catch (error) {
        await context.close();
        if (attempt === 2)
          failed.push(`${file} — ${(error as Error).message.split("\n")[0]}`);
      }
    }
  }
}

await browser.close();

console.log(
  `Capturas escritas (${written.length}):\n  ${written.join("\n  ") || "—"}`,
);
if (failed.length)
  console.log(
    `\nNo se pudieron tomar (${failed.length}):\n  ${failed.join("\n  ")}`,
  );
process.exit(written.length === 0 && failed.length > 0 ? 1 : 0);
