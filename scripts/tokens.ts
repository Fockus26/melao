/**
 * Genera `app/tokens.css` desde `design/tokens.json` (D018, D033).
 *
 * Uso: `bun run tokens` (escribe) · `bun run tokens --check` (falla si el CSS está desactualizado).
 * El test `tests/unit/tokens-css.test.ts` hace la misma comprobación en CI.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateTokensCss } from "../lib/tokens/css";

const OUTPUT = resolve(import.meta.dir, "../app/tokens.css");
const css = generateTokensCss();

if (process.argv.includes("--check")) {
  const current = readFileSync(OUTPUT, "utf8").replace(/\r\n/g, "\n");
  if (current !== css) {
    console.error(
      "app/tokens.css no coincide con design/tokens.json: corre `bun run tokens`.",
    );
    process.exit(1);
  }
  console.log("app/tokens.css al día.");
} else {
  writeFileSync(OUTPUT, css);
  console.log(`app/tokens.css generado (${css.split("\n").length} líneas).`);
}
