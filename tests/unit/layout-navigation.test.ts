import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminNav } from "@/components/layout/admin-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import {
  ADMIN_NAV,
  APP_NAV,
  PROGRESS_NAV,
  SIDE_NAV,
} from "@/components/layout/nav-items";
import { SideNav } from "@/components/layout/side-nav";
import { activeHref, matchesPath, normalizePath } from "@/lib/navigation";

const APP_HREFS = APP_NAV.map((i) => i.href);
const SIDE_HREFS = SIDE_NAV.map((i) => i.href);

describe("activeHref: prefijo más largo por segmentos", () => {
  test("Inicio solo en /app exacto", () => {
    expect(activeHref("/app", APP_HREFS)).toBe("/app");
    expect(activeHref("/app/", APP_HREFS)).toBe("/app");
    expect(activeHref("/app/course", APP_HREFS)).toBe("/app/course");
  });

  test("las rutas hijas marcan su destino", () => {
    expect(activeHref("/app/steps/enchufla", APP_HREFS)).toBe("/app/steps");
    expect(activeHref("/app/practice/songs", APP_HREFS)).toBe("/app/practice");
  });

  test("Progreso: sin destino en la barra (cae en Inicio), ítem propio en el lateral", () => {
    // /app/progress no es hijo de ningún destino de la barra salvo /app.
    expect(activeHref("/app/progress", APP_HREFS)).toBe("/app");
    expect(activeHref("/app/progress", SIDE_HREFS)).toBe("/app/progress");
  });

  test("no confunde prefijos de texto con segmentos", () => {
    expect(matchesPath("/app/steps-extra", "/app/steps")).toBe(false);
    expect(matchesPath("/application", "/app")).toBe(false);
    expect(activeHref("/admin", APP_HREFS)).toBeNull();
  });

  test("ignora query y hash; ruta vacía no activa nada", () => {
    expect(normalizePath("/app/course?estilo=salsa#u2")).toBe("/app/course");
    expect(activeHref("/app/course?x=1", APP_HREFS)).toBe("/app/course");
    expect(activeHref(null, APP_HREFS)).toBeNull();
    expect(activeHref("", APP_HREFS)).toBeNull();
  });

  test("admin: Resumen solo en /admin", () => {
    const hrefs = ADMIN_NAV.map((i) => i.href);
    expect(activeHref("/admin", hrefs)).toBe("/admin");
    expect(activeHref("/admin/songs/12", hrefs)).toBe("/admin/songs");
  });
});

describe("destinos (D028)", () => {
  test("barra: 5 destinos en orden; lateral: + Progreso como ítem 6", () => {
    expect(APP_NAV.map((i) => i.label)).toEqual([
      "Inicio",
      "Curso",
      "Practicar",
      "Pasos",
      "Perfil",
    ]);
    expect(SIDE_NAV).toHaveLength(6);
    expect(SIDE_NAV[5]).toBe(PROGRESS_NAV);
  });

  test("admin en el orden del handoff", () => {
    expect(ADMIN_NAV.map((i) => i.label)).toEqual([
      "Resumen",
      "Estilos",
      "Pasos",
      "Canciones",
      "Analizador de ritmo",
      "Camino",
      "Usuarios",
    ]);
  });
});

/** `aria-current="page"` debe estar exactamente en un enlace: el del destino activo. */
function currentLinks(html: string): string[] {
  return [...html.matchAll(/<a [^>]*aria-current="page"[^>]*>/g)].map(
    (m) => m[0].match(/href="([^"]+)"/)?.[1] ?? "",
  );
}

describe("estado activo renderizado", () => {
  test("BottomNav marca un solo destino y lleva nombre de landmark", () => {
    const html = renderToStaticMarkup(
      createElement(BottomNav, { currentPath: "/app/steps/enchufla" }),
    );
    expect(currentLinks(html)).toEqual(["/app/steps"]);
    expect(html).toContain('aria-label="Principal"');
  });

  test("SideNav: Progreso activo en el lateral; card del plan solo si llega", () => {
    const withPlan = renderToStaticMarkup(
      createElement(SideNav, {
        currentPath: "/app/progress",
        plan: { name: "Básico", status: "activo" },
      }),
    );
    expect(currentLinks(withPlan)).toEqual(["/app/progress"]);
    expect(withPlan).toContain("Tu plan");
    const noPlan = renderToStaticMarkup(
      createElement(SideNav, { currentPath: "/app" }),
    );
    expect(noPlan).not.toContain("Tu plan");
  });

  test("AdminNav: cada ítem del riel tiene aria-label; 'Ver como alumno' nunca activo", () => {
    const html = renderToStaticMarkup(
      createElement(AdminNav, { currentPath: "/admin/steps" }),
    );
    expect(currentLinks(html)).toEqual(["/admin/steps"]);
    for (const item of ADMIN_NAV)
      expect(html).toContain(`aria-label="${item.label}"`);
    expect(html).toContain('aria-label="Ver como alumno"');
  });
});
