import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ErrorScreen,
  OfflineScreen,
  ServerErrorScreen,
} from "@/components/status/error-screen";
import { formatLocalTime } from "@/components/status/local-time";
import { MaintenanceScreen } from "@/components/status/maintenance-screen";
import { NotFoundScreen } from "@/components/status/not-found-screen";
import {
  bypassesMaintenance,
  isMaintenanceOn,
  maintenanceUntil,
  retryAfterSeconds,
  shouldServeMaintenance,
} from "@/lib/maintenance";

const ON = { MAINTENANCE_MODE: "1" };

describe("modo mantenimiento (D111)", () => {
  test("se enciende solo con 1 o true", () => {
    expect(isMaintenanceOn({})).toBe(false);
    expect(isMaintenanceOn({ MAINTENANCE_MODE: "" })).toBe(false);
    expect(isMaintenanceOn({ MAINTENANCE_MODE: "0" })).toBe(false);
    expect(isMaintenanceOn({ MAINTENANCE_MODE: "false" })).toBe(false);
    expect(isMaintenanceOn({ MAINTENANCE_MODE: "1" })).toBe(true);
    expect(isMaintenanceOn({ MAINTENANCE_MODE: " TRUE " })).toBe(true);
  });

  test("apagado no reescribe nada", () => {
    expect(shouldServeMaintenance("/", {})).toBe(false);
    expect(shouldServeMaintenance("/app", { MAINTENANCE_MODE: "0" })).toBe(
      false,
    );
  });

  test("encendido reescribe páginas, también /maintenance visitada directo", () => {
    for (const path of ["/", "/app", "/app/course", "/login", "/maintenance"])
      expect(shouldServeMaintenance(path, ON)).toBe(true);
  });

  test("exentas: enlaces de auth, internos de Next y archivos", () => {
    for (const path of [
      "/auth/callback",
      "/auth/logout",
      "/_next/data/x.json",
      "/manifest.webmanifest",
      "/robots.txt",
      "/sitemap.xml",
      "/icon.svg",
    ])
      expect(bypassesMaintenance(path)).toBe(true);
    // Prefijo de texto no es segmento.
    expect(bypassesMaintenance("/authors")).toBe(false);
    expect(shouldServeMaintenance("/auth/callback", ON)).toBe(false);
  });

  test("MAINTENANCE_UNTIL: fecha ISO válida o nada", () => {
    expect(maintenanceUntil({})).toBeNull();
    expect(maintenanceUntil({ MAINTENANCE_UNTIL: "pronto" })).toBeNull();
    expect(
      maintenanceUntil({
        MAINTENANCE_UNTIL: "2026-10-01T23:30:00Z",
      })?.toISOString(),
    ).toBe("2026-10-01T23:30:00.000Z");
  });

  test("Retry-After en segundos hacia arriba; sin hora o ya pasada, sin cabecera", () => {
    const now = new Date("2026-10-01T20:00:00Z");
    expect(retryAfterSeconds(null, now)).toBeNull();
    expect(retryAfterSeconds(new Date("2026-10-01T21:00:00Z"), now)).toBe(
      "3600",
    );
    expect(retryAfterSeconds(new Date("2026-10-01T20:00:00.200Z"), now)).toBe(
      "1",
    );
    expect(retryAfterSeconds(new Date("2026-10-01T19:00:00Z"), now)).toBeNull();
  });
});

const h1Count = (html: string) => html.match(/<h1[\s>]/g)?.length ?? 0;
const hrefs = (html: string) =>
  [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

describe("pantallas de estado (D109–D110)", () => {
  test("404 con sesión: inicio de la app y el curso", () => {
    const html = renderToStaticMarkup(
      createElement(NotFoundScreen, { signedIn: true }),
    );
    expect(h1Count(html)).toBe(1);
    expect(html).toContain("Este paso no está en la coreografía");
    expect(hrefs(html)).toEqual(["/app", "/app", "/app/course"]);
    expect(html).toContain("Ver mi curso");
  });

  test("404 sin sesión: portada y Entrar", () => {
    const html = renderToStaticMarkup(
      createElement(NotFoundScreen, { signedIn: false }),
    );
    expect(hrefs(html)).toEqual(["/", "/", "/login"]);
    expect(html).toContain("Entrar");
  });

  test("la cuenta es decorativa: oculta a lectores de pantalla", () => {
    const html = renderToStaticMarkup(
      createElement(NotFoundScreen, { signedIn: false }),
    );
    expect(html).toMatch(/<div aria-hidden="true" data-count="steady"/);
  });

  test("500 con código muestra el digest; sin código, ni la fila ni la frase", () => {
    const withCode = renderToStaticMarkup(
      createElement(ServerErrorScreen, { digest: "3807164215" }),
    );
    expect(h1Count(withCode)).toBe(1);
    expect(withCode).toContain("<code");
    expect(withCode).toContain("3807164215");
    expect(withCode).toContain("escríbenos con este código");
    expect(withCode).toContain('data-count="offbeat"');

    const noCode = renderToStaticMarkup(createElement(ServerErrorScreen, {}));
    expect(noCode).not.toContain("<code");
    expect(noCode).not.toContain("este código");
  });

  test("sin conexión: aviso con role=status y solo Reintentar", () => {
    const html = renderToStaticMarkup(createElement(OfflineScreen, {}));
    expect(h1Count(html)).toBe(1);
    expect(html).toContain('role="status"');
    expect(html).toContain("Reintentar");
    expect(html).not.toContain("Ir al inicio");
  });

  test("ErrorScreen en el servidor asume conexión (500) y puede poner el título", () => {
    const html = renderToStaticMarkup(
      createElement(ErrorScreen, { digest: "1", documentTitle: true }),
    );
    expect(html).toContain("Algo se nos desacompasó");
    expect(html).toContain("<title>Algo salió mal · Melao</title>");
  });

  test("mantenimiento: logo sin enlace y hora solo si existe", () => {
    const withTime = renderToStaticMarkup(
      createElement(MaintenanceScreen, { until: "2026-10-01T23:30:00.000Z" }),
    );
    expect(h1Count(withTime)).toBe(1);
    expect(hrefs(withTime)).toEqual([]);
    expect(withTime).toContain("Volvemos aproximadamente");
    expect(withTime).toContain('dateTime="2026-10-01T23:30:00.000Z"');

    const noTime = renderToStaticMarkup(
      createElement(MaintenanceScreen, { until: null }),
    );
    expect(noTime).not.toContain("Volvemos aproximadamente");
  });

  test("la hora se formatea en es-419 con la zona", () => {
    expect(formatLocalTime("2026-10-01T23:30:00.000Z", "UTC")).toMatch(
      /1 de octubre.*(23|11):30.*UTC/,
    );
  });
});
