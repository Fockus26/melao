// Calibrar audífonos: dispositivo guardado (D143), formato del ajuste y los estados de la
// pantalla renderizados. Las reglas de la medición viven en el core (core-calibracion.test.ts)
// y el guardado en SQL (db-calibration.test.ts); aquí solo su presentación.
import { describe, expect, mock, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  deviceFor,
  deviceOs,
  evaluateCalibration,
  formatOffset,
  type SavedLatency,
} from "@/lib/calibration/calibration";

const navigation = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navigation,
  useRouter: () => ({ refresh() {}, push() {}, replace() {} }),
}));
const { CalibrationFlow } = await import(
  "@/components/calibration/calibration-flow"
);
type Props = Parameters<typeof CalibrationFlow>[0];

const UA = {
  android:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36",
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  windows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  chromeos:
    "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
  linux:
    "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
};

describe("dispositivo (D143)", () => {
  test("sistema por user agent, Android y ChromeOS antes que Linux", () => {
    expect(deviceOs(UA.android)).toBe("android");
    expect(deviceOs(UA.iphone)).toBe("ios");
    expect(deviceOs(UA.windows)).toBe("windows");
    expect(deviceOs(UA.mac)).toBe("mac");
    expect(deviceOs(UA.chromeos)).toBe("chromeos");
    expect(deviceOs(UA.linux)).toBe("linux");
    expect(deviceOs("")).toBe("other");
  });

  test("clave <salida>:<sistema>, estable y sin versión ni modelo", () => {
    expect(deviceFor("bluetooth", UA.android)).toEqual({
      key: "bluetooth:android",
      label: "Audífonos Bluetooth · Android",
    });
    expect(deviceFor("speaker", UA.windows).key).toBe("speaker:windows");
    for (const ua of Object.values(UA)) {
      const { key, label } = deviceFor("bluetooth", ua);
      expect(key).toMatch(/^(bluetooth|speaker):[a-z]+$/);
      expect(key.length).toBeLessThanOrEqual(120);
      expect(label.length).toBeLessThanOrEqual(120);
    }
  });
});

test("formato con signo", () => {
  expect(formatOffset(180)).toBe("+180 ms");
  expect(formatOffset(0)).toBe("0 ms");
  expect(formatOffset(-15)).toBe("-15 ms");
});

const STEADY = evaluateCalibration([
  0, 0, 0, 0, 170, 185, 180, 175, 190, 182, 178, 180,
]);
const SAVED: SavedLatency[] = [
  {
    deviceKey: "bluetooth:android",
    label: "Audífonos Bluetooth · Android",
    offsetMs: 180,
    measuredAt: "2026-09-28T21:30:00.000Z",
  },
];

const render = (p: Partial<Props> = {}) =>
  renderToStaticMarkup(
    createElement(CalibrationFlow, {
      saved: SAVED,
      closeHref: "/app/profile",
      mode: "sample",
      ...p,
    }),
  );

describe("pantalla", () => {
  test("antes de empezar: pregunta la salida, 1 de 3 y cerrar a Perfil", () => {
    const html = render();
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain("Audífonos Bluetooth");
    expect(html).toContain("Altavoz o audífonos con cable");
    expect(html).toContain("Paso 1 de 3");
    expect(html).toContain('href="/app/profile"');
    expect(html).toContain('aria-label="Cerrar y volver al perfil"');
  });

  test("escucha y toca: progressbar de 12 con el toque actual", () => {
    const html = render({ initialPhase: { kind: "listen", taps: 5 } });
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuemax="12"');
    expect(html).toContain('aria-valuenow="5"');
    expect(html).toContain('aria-valuetext="Toque 5 de 12"');
    expect(html).toContain("Paso 2 de 3");
    // 5 puntos llenos de 12.
    expect(html.match(/bg-gold-600/g)?.length).toBe(5);
  });

  test("resultado: valor con signo, desvío y gráfico con nombre", () => {
    const html = render({
      initialPhase: {
        kind: "result",
        result: { ...STEADY, offsetMs: 180 },
      },
    });
    expect(html).toContain("+180 ms");
    expect(html).toContain("Toques parejos · desvío 6 ms");
    expect(html).toMatch(/role="img" aria-label="Tus 8 toques medidos[^"]+"/);
    expect(html).toContain("Guardar ajuste");
    expect(html).toContain("Probar con la cuenta");
  });

  test("ajuste fino: slider −200…300 y Guardar con el valor", () => {
    const html = render({
      initialPhase: { kind: "fine", value: 190, result: STEADY },
    });
    expect(html).toContain('aria-valuemin="-200"');
    expect(html).toContain('aria-valuemax="300"');
    expect(html).toContain("Guardar +190 ms");
    expect(html).toContain('aria-label="Subir 10 ms"');
  });

  test("toques irregulares: el aviso dice por qué", () => {
    const irregular = evaluateCalibration([
      0, 0, 0, 0, 100, 200, 150, 250, 120, 180, 90, 230,
    ]);
    expect(
      render({ initialPhase: { kind: "irregular", result: irregular } }),
    ).toContain("desvío de 60 ms");
    const incomplete = evaluateCalibration([0, 0, 0, 0, 180]);
    expect(
      render({ initialPhase: { kind: "irregular", result: incomplete } }),
    ).toContain("Contamos 5 de 12 toques");
  });

  test("sin audífonos: lista los ajustes guardados; el más reciente en uso", () => {
    const html = render({ initialPhase: { kind: "speaker" } });
    expect(html).toContain("Audífonos Bluetooth · Android");
    expect(html).toContain("En uso");
    expect(
      render({ initialPhase: { kind: "speaker" }, saved: [] }),
    ).toContain("Todavía no guardaste ningún ajuste.");
  });
});
