/**
 * Tests afectados — corre solo los tests cuyo grafo de imports toca algún archivo cambiado.
 *
 * Uso (desde la raíz del proyecto):
 *   bun run test:related                         # = bun scripts/test-related.ts; cambios vs. origin/main + sin commitear
 *   bun scripts/test-related.ts --base=main
 *   bun scripts/test-related.ts --list           # solo lista, no ejecuta
 *
 * Cómo decide: por cada archivo de test sigue sus imports (relativos y alias de tsconfig,
 * p. ej. `@/…`) hasta el fondo, y lo elige si alguno de esos archivos cambió. Así, un
 * cambio en logros NO corre el test del tutorial… salvo que el tutorial importe algo de
 * logros, que es justo cuando sí debe correr.
 *
 * Es para el bucle de trabajo del agente (rápido y con poca salida). **No sustituye a la
 * suite completa**: la corre CI en cada PR. Si cambió algo que no es código importable
 * (lockfile, tsconfig, config del bundler, dependencias o scripts de package.json, el
 * propio runner), corre todo por seguridad. Subir solo la `version` no cuenta.
 *
 * Validado sobre World Flags (commits reales): el panel de racha → 0 tests; un arreglo de
 * logros → su test + el del changelog (lo lee con fs); un cambio en `learning-storage.ts`
 * → sync, logros, preferencia de sonido y la guardia del tutorial.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { Glob } from "bun";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const base =
  args.find((a) => a.startsWith("--base="))?.slice(7) ?? "origin/main";
const listOnly = args.includes("--list");

const TEST_GLOBS = ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"];
// Si cambia algo de esto, el grafo no basta: se corre la suite entera.
// (`package.json` va aparte: subir solo la `version` no es motivo, pasa en casi cada PR.)
const RUN_ALL_IF_CHANGED = [
  /^bun\.lockb?$/,
  /^tsconfig.*\.json$/,
  /^bunfig\.toml$/,
  /(^|\/)(astro|vite|next|vitest)\.config\.\w+$/,
  /^scripts\/test-related\.ts$/,
];

const sh = (cmd: string[]) => {
  const p = Bun.spawnSync(cmd, { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
  return p.success ? p.stdout.toString() : "";
};

const changed = new Set(
  [
    sh(["git", "diff", "--name-only", `${base}...HEAD`]),
    sh(["git", "diff", "--name-only", "HEAD"]),
    sh(["git", "ls-files", "--others", "--exclude-standard"]),
  ]
    .join("\n")
    .split("\n")
    .map((f) => f.trim().replaceAll("\\", "/"))
    .filter(Boolean),
);

const tests = TEST_GLOBS.flatMap((g) => [...new Glob(g).scanSync(ROOT)]).map(
  (f) => f.replaceAll("\\", "/"),
);

function runAll(reason: string): string[] {
  console.log(`→ Suite completa (${reason}).`);
  return tests;
}

const transpiler = new Bun.Transpiler({ loader: "tsx" });
const graphCache = new Map<string, Set<string>>();

/** Archivos del proyecto (relativos a ROOT) que `file` importa, directa o indirectamente. */
function dependencies(file: string, seen = new Set<string>()): Set<string> {
  if (seen.has(file)) return seen;
  seen.add(file);
  const abs = resolve(ROOT, file);
  if (!/\.(m?[jt]sx?)$/.test(file) || !existsSync(abs)) return seen;

  let imports: { path: string }[] = [];
  try {
    imports = transpiler.scanImports(readFileSync(abs, "utf8"));
  } catch {
    return seen; // archivo que el transpilador no entiende: se queda como hoja
  }

  for (const { path } of imports) {
    const spec = path.split("?")[0]; // `./CHANGELOG.md?raw` → `./CHANGELOG.md`
    let target: string;
    try {
      target = Bun.resolveSync(spec, dirname(abs)); // respeta los alias de tsconfig
    } catch {
      continue;
    }
    const rel = relative(ROOT, target).replaceAll("\\", "/");
    if (rel.startsWith("..") || rel.includes("node_modules/")) continue; // dependencias externas
    dependencies(rel, seen);
  }
  return seen;
}

/** ¿Cambió en `package.json` algo más que la línea de `version`? */
function packageJsonChangedBeyondVersion(): boolean {
  const diff = [
    sh(["git", "diff", "-U0", `${base}...HEAD`, "--", "package.json"]),
    sh(["git", "diff", "-U0", "HEAD", "--", "package.json"]),
  ].join("\n");
  return diff
    .split("\n")
    .filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l))
    .some((l) => !/^[+-]\s*"version"\s*:/.test(l));
}

/** Archivos que un test lee por nombre en vez de importarlos (`readFileSync("CHANGELOG.md")`). */
function mentionsChangedFile(test: string): boolean {
  const source = readFileSync(resolve(ROOT, test), "utf8");
  return [...changed].some((f) => {
    const name = f.split("/").pop() ?? f;
    return !/\.(m?[jt]sx?)$/.test(name) && source.includes(name);
  });
}

function selectTests(): string[] {
  if (changed.size === 0) return [];
  const trigger = [...changed].find((f) =>
    RUN_ALL_IF_CHANGED.some((re) => re.test(f)),
  );
  if (trigger) return runAll(`cambió ${trigger}`);
  if (changed.has("package.json") && packageJsonChangedBeyondVersion()) {
    return runAll("cambiaron dependencias o scripts en package.json");
  }

  return tests.filter((test) => {
    if (changed.has(test)) return true;
    let deps = graphCache.get(test);
    if (!deps) {
      deps = dependencies(test);
      graphCache.set(test, deps);
    }
    return [...deps].some((d) => changed.has(d)) || mentionsChangedFile(test);
  });
}

const selected = selectTests();

if (selected.length === 0) {
  console.log(
    changed.size === 0
      ? "→ Sin cambios: no hay tests que correr."
      : "→ Ningún test depende de lo que cambió.",
  );
  process.exit(0);
}

console.log(
  `→ ${selected.length}/${tests.length} tests afectados:\n  ${selected.join("\n  ")}`,
);
if (listOnly) process.exit(0);

// `--dots`: un punto por test que pasa y el detalle completo solo de los que fallan.
const run = Bun.spawnSync(
  ["bun", "test", "--dots", ...selected.map((t) => `./${t}`)],
  {
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
  },
);
process.exit(run.exitCode ?? 1);
