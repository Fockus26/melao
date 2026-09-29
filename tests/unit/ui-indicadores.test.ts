import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BeatRow, beatCells } from "@/components/indicators/beat-row";
import { Difficulty, filledBars } from "@/components/indicators/difficulty";
import {
  LessonProgress,
  lessonProgress,
} from "@/components/indicators/lesson-progress";
import { PathNode } from "@/components/indicators/path-node";
import { RatingButtons } from "@/components/indicators/rating-buttons";
import { StepStatus } from "@/components/indicators/step-status";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(el);
const count = (s: string, needle: string) => s.split(needle).length - 1;

const INTERVALS = { 1: "< 1 día", 2: "1 día", 3: "3 días", 4: "8 días" };

describe("Difficulty", () => {
  test("acota el nivel a 0–5", () => {
    expect(filledBars(3)).toBe(3);
    expect(filledBars(9)).toBe(5);
    expect(filledBars(-1)).toBe(0);
    expect(filledBars(Number.NaN)).toBe(0);
  });

  test("5 barras decorativas y siempre texto", () => {
    const out = html(createElement(Difficulty, { level: 3 }));
    expect(count(out, 'data-filled="true"')).toBe(3);
    expect(count(out, 'data-filled="false"')).toBe(2);
    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain("Dificultad 3");
    expect(
      html(createElement(Difficulty, { level: 3, label: "Media" })),
    ).toContain("Media");
  });
});

describe("StepStatus", () => {
  test("cada estado lleva su etiqueta en texto", () => {
    for (const [status, label] of [
      ["unknown", "No lo sé"],
      ["learning", "Aprendiendo"],
      ["known", "Me lo sé"],
    ] as const) {
      expect(html(createElement(StepStatus, { status }))).toContain(label);
    }
  });
});

describe("LessonProgress", () => {
  test("acota completadas y total", () => {
    expect(lessonProgress(8, 6)).toEqual({ done: 6, max: 6 });
    expect(lessonProgress(-2, 0)).toEqual({ done: 0, max: 1 });
  });

  test("progressbar con valor y texto", () => {
    const out = html(createElement(LessonProgress, { completed: 2, total: 6 }));
    expect(out).toContain('role="progressbar"');
    expect(out).toContain('aria-valuenow="2"');
    expect(out).toContain('aria-valuemin="0"');
    expect(out).toContain('aria-valuemax="6"');
    expect(out).toContain('aria-valuetext="2 de 6 etapas"');
    expect(count(out, 'data-done="true"')).toBe(2);
    expect(out).toContain("motion-reduce:transition-none");
  });
});

describe("PathNode", () => {
  const base = {
    number: 3,
    title: "Enchufla",
    label: "Lección 3",
    href: "/app/leccion/3",
  };

  test("la bloqueada no es enlace ni enfocable, y dice su estado", () => {
    const out = html(createElement(PathNode, { ...base, state: "locked" }));
    expect(out).not.toContain("<a");
    expect(out).not.toContain("tabindex");
    expect(out).toContain("Lección 3 · Bloqueada");
  });

  test("la actual tiene un solo enlace, Continuar, con el nombre de la lección", () => {
    const out = html(createElement(PathNode, { ...base, state: "current" }));
    expect(count(out, "<a")).toBe(1);
    expect(out).toContain("Continuar");
    expect(out).toContain("Enchufla");
    expect(out).toContain("Lección 3 · Actual");
    expect(out).toContain("bg-gold-tint");
  });

  test("completada, disponible y repaso: la fila entera es el enlace", () => {
    for (const state of ["completed", "available", "review"] as const) {
      const out = html(createElement(PathNode, { ...base, state }));
      expect(out.startsWith("<a")).toBe(true);
      expect(out).toContain("min-h-12");
    }
  });
});

describe("RatingButtons", () => {
  test("fieldset + legend y 4 radios nativos en el orden fijo", () => {
    const out = html(
      createElement(RatingButtons, {
        name: "r",
        legend: "Enchufla",
        intervals: INTERVALS,
        defaultValue: 3,
      }),
    );
    expect(out).toContain("<fieldset");
    expect(out).toContain("<legend");
    expect(count(out, 'type="radio"')).toBe(4);
    const order = ["Muy difícil", "Difícil", "Bien", "Fácil"].map((l) =>
      out.indexOf(`>${l}<`),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(out).toContain('checked="" value="3"');
    expect(out).toContain("&lt; 1 día");
  });

  test("2 × 2 en móvil, 4 columnas desde md; 64 de alto", () => {
    const out = html(
      createElement(RatingButtons, {
        name: "r",
        legend: "x",
        intervals: INTERVALS,
      }),
    );
    expect(out).toContain("grid-cols-2");
    expect(out).toContain("md:grid-cols-4");
    expect(out).toContain("min-h-16");
    expect(out).not.toMatch(/text-(error|success)/);
  });
});

describe("BeatRow", () => {
  test("celdas: silenciosos y activo", () => {
    const cells = beatCells(8, [4, 8], 4);
    expect(cells).toHaveLength(8);
    expect(cells.filter((c) => c.silent).map((c) => c.beat)).toEqual([4, 8]);
    expect(cells.filter((c) => c.active).map((c) => c.beat)).toEqual([4]);
    expect(beatCells(8, [], null).some((c) => c.active)).toBe(false);
    expect(beatCells(8, [], 12).some((c) => c.active)).toBe(false);
  });

  test("lista con aria-current y sin aria-live", () => {
    const out = html(
      createElement(BeatRow, {
        beatsPerPhrase: 8,
        silentBeats: [4, 8],
        activeBeat: 2,
      }),
    );
    expect(out).toContain("<ol");
    expect(count(out, "<li")).toBe(8);
    expect(count(out, 'aria-current="true"')).toBe(1);
    expect(out).not.toContain("aria-live");
    expect(out).toContain("4, en silencio");
    expect(out).not.toContain("transition");
  });
});
