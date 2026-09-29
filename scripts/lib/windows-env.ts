/**
 * Arreglos de entorno de Windows para los scripts con Playwright (`a11y-check`, `pr-screenshots`).
 * Funciones puras (el sistema de archivos se inyecta) para poder probarlas con `bun test`.
 *
 * 1. Rutas convertidas por MSYS. En Git Bash, un argumento que empieza con `/` se convierte en
 *    ruta de Windows antes de llegar a node: `/indicadores` → `C:/Program Files/Git/indicadores`.
 *    Una ruta web nunca es una ruta absoluta de Windows, así que se recupera quitando la raíz
 *    de Git. (Alternativas sin script: `//indicadores`, `indicadores` o `MSYS_NO_PATHCONV=1`.)
 *
 * 2. Chromium de Playwright no encontrado (D071). Claude Desktop y PowerShell de la Microsoft
 *    Store son apps MSIX: lo que un proceso hijo escribe en `%LOCALAPPDATA%` se redirige a
 *    `%LOCALAPPDATA%\Packages\<paquete>\LocalCache\Local\`. Si `playwright install` corrió
 *    desde una de ellas, los navegadores quedan ahí y cualquier otra terminal no los ve en
 *    `%LOCALAPPDATA%\ms-playwright`. Si falta la carpeta estándar, se busca en esas copias y
 *    se fija `PLAYWRIGHT_BROWSERS_PATH` para este proceso (nunca en la configuración global).
 */

import { existsSync, readdirSync } from "node:fs";

/** Ruta web a partir de un argumento de la línea de comandos (ver 1). */
export function normalizeRoute(arg: string, gitRoots: string[] = []): string {
  let route = arg.trim().replaceAll("\\", "/");
  if (/^[A-Za-z]:\//.test(route)) {
    const lower = route.toLowerCase();
    const root = gitRoots
      .map((r) => r.replaceAll("\\", "/").replace(/\/+$/, ""))
      .filter((r) => r && lower.startsWith(`${r.toLowerCase()}/`))
      .sort((a, b) => b.length - a.length)[0];
    // Sin raíz conocida, la instalación estándar deja `…/Git/<ruta>`; si tampoco, MSYS leyó
    // el primer segmento de una letra como unidad (`/a/b` → `A:/b`) y se deshace.
    const git = /^[A-Za-z]:\/(?:.*\/)?Git(\/.*)?$/i.exec(route);
    if (root) route = route.slice(root.length);
    else if (git) route = git[1] ?? "/";
    else route = `/${route[0].toLowerCase()}${route.slice(2)}`;
  }
  route = route.replace(/^\/+/, "");
  return `/${route}`;
}

/** Raíces de Git para Windows que MSYS antepone (de las variables de Git Bash). */
export function msysRoots(env: Record<string, string | undefined>): string[] {
  const roots: string[] = [];
  // EXEPATH = `C:\Program Files\Git\bin` (o la raíz misma, según el lanzador).
  if (env.EXEPATH) {
    const exe = env.EXEPATH.replaceAll("\\", "/").replace(/\/+$/, "");
    roots.push(exe.replace(/\/(bin|usr\/bin|mingw64\/bin)$/i, ""), exe);
  }
  return roots;
}

type Fs = {
  exists: (path: string) => boolean;
  readdir: (path: string) => string[];
};

const hasChromium = (fs: Fs, dir: string) =>
  fs.exists(dir) && fs.readdir(dir).some((d) => d.startsWith("chromium"));

/**
 * Carpeta de navegadores a usar, o `null` si no hace falta tocar nada (ver 2).
 * Prefiere la copia de Claude Desktop, que es donde instalan los agentes.
 */
export function findBrowsersPath(
  env: Record<string, string | undefined>,
  platform: string,
  fs: Fs,
): string | null {
  if (platform !== "win32" || env.PLAYWRIGHT_BROWSERS_PATH) return null;
  const local = env.LOCALAPPDATA;
  if (!local) return null;
  if (hasChromium(fs, `${local}\\ms-playwright`)) return null;
  const packages = `${local}\\Packages`;
  if (!fs.exists(packages)) return null;
  const candidates = fs
    .readdir(packages)
    .sort(
      (a, b) =>
        Number(b.startsWith("Claude_")) - Number(a.startsWith("Claude_")),
    )
    .map((p) => `${packages}\\${p}\\LocalCache\\Local\\ms-playwright`);
  return candidates.find((dir) => hasChromium(fs, dir)) ?? null;
}

/**
 * Aplica (2) a este proceso con el sistema de archivos real. Llamarla **antes** de importar
 * Playwright: la carpeta de navegadores se lee al cargar el módulo.
 */
export function prepareBrowsersPath(): void {
  const dir = findBrowsersPath(process.env, process.platform, {
    exists: existsSync,
    readdir: (p) => {
      try {
        return readdirSync(p);
      } catch {
        return [];
      }
    },
  });
  if (dir) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = dir;
    console.log(`PLAYWRIGHT_BROWSERS_PATH=${dir}`);
  }
}

/** Mensaje cuando Chromium no arranca: el comando exacto para instalarlo. */
export const BROWSER_HINT =
  "No se encontró el Chromium de Playwright. Instálalo con `bunx playwright install chromium` " +
  "o apunta PLAYWRIGHT_BROWSERS_PATH a una carpeta ms-playwright existente " +
  "(p. ej. %LOCALAPPDATA%\\Packages\\Claude_*\\LocalCache\\Local\\ms-playwright).";
