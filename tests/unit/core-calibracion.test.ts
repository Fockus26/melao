/**
 * Calibración a oído (D142): reglas del core y runner de `docs/spec/vectors/calibracion-*.json`.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CALIBRATION_CLICKS,
  CALIBRATION_INTERVAL_MS,
  CALIBRATION_MEASURED_TAPS,
  calibrationClickTimesMs,
  clampLatencyMs,
  evaluateCalibration,
  stepLatencyMs,
  tapOffsetsMs,
} from "@/supabase/functions/_shared/core/calibration.ts";

const DIR = join(import.meta.dir, "../../docs/spec/vectors");
const files = readdirSync(DIR).filter(
  (f) => f.startsWith("calibracion-") && f.endsWith(".json"),
);

// biome-ignore lint/suspicious/noExplicitAny: salida JSON libre de cada vector
type Json = any;

describe("vectores calibracion-*", () => {
  test("hay al menos un vector", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const vector: Json = JSON.parse(readFileSync(join(DIR, file), "utf8"));
    describe(file, () => {
      vector.entrada.casos.forEach((caso: Json, i: number) => {
        test(caso.nombre, () => {
          const r = evaluateCalibration(caso.desfases);
          const want = vector.salida.casos[i];
          expect({
            estado: r.status,
            toques: r.taps,
            promedio: r.offsetMs,
            desvio: r.sdMs,
          }).toEqual(want);
          expect(r.measuredMs.length).toBe(
            r.status === "incomplete" ? 0 : CALIBRATION_MEASURED_TAPS,
          );
        });
      });
      test("acotar", () => {
        expect(vector.entrada.acotar.map(clampLatencyMs)).toEqual(
          vector.salida.acotar,
        );
      });
      test("pasos", () => {
        expect(
          vector.entrada.pasos.map((p: Json) =>
            stepLatencyMs(p.valor, p.direccion),
          ),
        ).toEqual(vector.salida.pasos);
      });
    });
  }
});

describe("calibración", () => {
  test("12 clics a 100 BPM: cada 600 ms desde 0", () => {
    const clicks = calibrationClickTimesMs();
    expect(clicks).toHaveLength(CALIBRATION_CLICKS);
    expect(CALIBRATION_INTERVAL_MS).toBe(600);
    expect(clicks[0]).toBe(0);
    expect(clicks[11]).toBe(6600);
  });

  test("cada toque con su clic, no con el más cercano (Bluetooth > medio tiempo)", () => {
    const clicks = calibrationClickTimesMs();
    // 340 ms de latencia: el clic más cercano a cada toque sería el siguiente (−260 ms).
    const taps = clicks.map((c) => c + 340);
    expect(tapOffsetsMs(taps, clicks)).toEqual(clicks.map(() => 340));
  });

  test("los toques de más se ignoran", () => {
    expect(tapOffsetsMs([10, 20, 30], [0, 0])).toEqual([10, 20]);
  });

  test("los 4 de práctica no cuentan", () => {
    const r = evaluateCalibration([
      900, -900, 900, -900, 100, 100, 100, 100, 100, 100, 100, 100,
    ]);
    expect(r).toMatchObject({ status: "ok", offsetMs: 100, sdMs: 0 });
  });

  test("desvío justo en 40: todavía parejo", () => {
    // Medidos ±a alternados: desvío muestral = a·√(8/7). Con a = 40·√(7/8) da 40.
    const a = 40 * Math.sqrt(7 / 8);
    const measured = [1, -1, 1, -1, 1, -1, 1, -1].map((s) => 100 + s * a);
    const r = evaluateCalibration([0, 0, 0, 0, ...measured]);
    expect(r.sdMs).toBe(40);
    expect(r.status).toBe("ok");
  });

  test("promedio en el borde del rango: vale; un ms fuera, no", () => {
    const at = (v: number) =>
      evaluateCalibration([0, 0, 0, 0, ...Array(8).fill(v)]).status;
    expect(at(300)).toBe("ok");
    expect(at(-200)).toBe("ok");
    expect(at(301)).toBe("out_of_range");
    expect(at(-201)).toBe("out_of_range");
  });
});
