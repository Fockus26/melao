import { describe, expect, test } from "bun:test";
import {
  findBrowsersPath,
  msysRoots,
  normalizeRoute,
} from "../../scripts/lib/windows-env.ts";

describe("normalizeRoute", () => {
  const roots = msysRoots({ EXEPATH: "C:\\Program Files\\Git\\bin" });

  test("deja igual una ruta web normal", () => {
    expect(normalizeRoute("/primitives", roots)).toBe("/primitives");
    expect(normalizeRoute("/", roots)).toBe("/");
  });

  test("acepta rutas sin barra inicial y con doble barra", () => {
    expect(normalizeRoute("indicators")).toBe("/indicators");
    expect(normalizeRoute("//indicators")).toBe("/indicators");
    expect(normalizeRoute("")).toBe("/");
  });

  test("recupera lo que MSYS convirtió con la raíz de EXEPATH", () => {
    expect(normalizeRoute("C:/Program Files/Git/indicators", roots)).toBe(
      "/indicators",
    );
    expect(normalizeRoute("C:/Program Files/Git/", roots)).toBe("/");
    expect(normalizeRoute("c:\\program files\\git\\a\\b?x=1", roots)).toBe(
      "/a/b?x=1",
    );
  });

  test("sin EXEPATH reconoce la instalación estándar de Git", () => {
    expect(normalizeRoute("D:/Tools/Git/layouts")).toBe("/layouts");
    expect(normalizeRoute("C:/Program Files/Git")).toBe("/");
  });

  test("deshace la conversión de segmento de una letra a unidad", () => {
    expect(normalizeRoute("A:/b")).toBe("/a/b");
  });
});

describe("msysRoots", () => {
  test("quita el /bin de EXEPATH", () => {
    expect(msysRoots({ EXEPATH: "C:\\Program Files\\Git\\bin" })).toContain(
      "C:/Program Files/Git",
    );
  });
  test("sin Git Bash no hay raíces", () => {
    expect(msysRoots({})).toEqual([]);
  });
});

describe("findBrowsersPath", () => {
  const LOCAL = "C:\\Users\\A\\AppData\\Local";
  const fsWith = (tree: Record<string, string[]>) => ({
    exists: (p: string) => p in tree,
    readdir: (p: string) => tree[p] ?? [],
  });
  const claude = `${LOCAL}\\Packages\\Claude_x\\LocalCache\\Local\\ms-playwright`;
  const pwsh = `${LOCAL}\\Packages\\Microsoft.PowerShell_y\\LocalCache\\Local\\ms-playwright`;

  test("no toca nada fuera de Windows ni si ya hay variable", () => {
    const fs = fsWith({});
    expect(findBrowsersPath({ LOCALAPPDATA: LOCAL }, "linux", fs)).toBeNull();
    expect(
      findBrowsersPath(
        { LOCALAPPDATA: LOCAL, PLAYWRIGHT_BROWSERS_PATH: "X" },
        "win32",
        fs,
      ),
    ).toBeNull();
  });

  test("no toca nada si la carpeta estándar tiene Chromium", () => {
    const fs = fsWith({
      [`${LOCAL}\\ms-playwright`]: ["chromium_headless_shell-1243"],
      [claude]: ["chromium-1243"],
    });
    expect(findBrowsersPath({ LOCALAPPDATA: LOCAL }, "win32", fs)).toBeNull();
  });

  test("usa la copia virtualizada, con preferencia por Claude", () => {
    const fs = fsWith({
      [`${LOCAL}\\Packages`]: ["Microsoft.PowerShell_y", "Claude_x", "Otro_z"],
      [pwsh]: ["chromium-1243"],
      [claude]: ["chromium-1243", "ffmpeg-1011"],
    });
    expect(findBrowsersPath({ LOCALAPPDATA: LOCAL }, "win32", fs)).toBe(claude);
  });

  test("ignora copias sin Chromium y devuelve null si no hay ninguna", () => {
    const fs = fsWith({
      [`${LOCAL}\\Packages`]: ["Claude_x"],
      [claude]: ["ffmpeg-1011"],
    });
    expect(findBrowsersPath({ LOCALAPPDATA: LOCAL }, "win32", fs)).toBeNull();
  });
});
