// Supabase empaqueta cada Edge Function con el `deno.json` de SU carpeta: el global de
// supabase/functions/ solo sirve en local. Cada función debe traer uno con los mismos imports.
import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dir, "..", "..", "supabase", "functions");
const root = JSON.parse(readFileSync(join(dir, "deno.json"), "utf8"));
const functions = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name);

describe("deno.json por Edge Function", () => {
  test("hay funciones", () => {
    expect(functions.length).toBeGreaterThan(0);
  });
  for (const name of functions) {
    test(`${name} trae su deno.json con los imports del global`, () => {
      const file = join(dir, name, "deno.json");
      expect(existsSync(file)).toBe(true);
      expect(JSON.parse(readFileSync(file, "utf8")).imports).toEqual(
        root.imports,
      );
    });
  }
});
