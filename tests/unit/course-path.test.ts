// lib/course/path.ts: presentación del curso para Inicio (sin reglas: esas viven en SQL).
import { describe, expect, test } from "bun:test";
import {
  type CoursePath,
  type LessonStatus,
  pickCurrentStyle,
  relativeDays,
  reviewMinutes,
  type StyleOption,
  stepNamesLine,
  styleProgressLine,
  summarizeCourse,
  toLessonStatus,
} from "@/lib/course/path";

const path = (statuses: LessonStatus[]): CoursePath => ({
  courseId: "c",
  lessonCount: statuses.length,
  lessons: statuses.map((status, i) => ({
    unitId: i < 3 ? "u1" : "u2",
    unitPosition: i < 3 ? 1 : 2,
    unitTitle: i < 3 ? "Fundamentos" : "Primeras figuras",
    lessonId: `l${i + 1}`,
    lessonPosition: (i % 3) + 1,
    number: i + 1,
    title: `Lección ${i + 1}`,
    stepCount: 2,
    status,
  })),
});

const style = (over: Partial<StyleOption> = {}): StyleOption => ({
  id: "salsa",
  name: "Salsa casino",
  hasRoles: true,
  chosen: true,
  hasCourse: true,
  lessonCount: 6,
  completedCount: 2,
  ...over,
});

describe("summarizeCourse", () => {
  test("lección actual y avance de su unidad", () => {
    const s = summarizeCourse(
      path([
        "completed",
        "completed",
        "completed",
        "current",
        "locked",
        "locked",
      ]),
    );
    expect(s.current?.lessonId).toBe("l4");
    expect(s.completedCount).toBe(3);
    expect(s.finished).toBe(false);
    expect(s.unit).toEqual({
      position: 2,
      title: "Primeras figuras",
      done: 0,
      total: 3,
    });
  });

  test("curso terminado: sin actual ni unidad", () => {
    const s = summarizeCourse(path(Array(6).fill("completed")));
    expect(s).toMatchObject({ current: null, finished: true, unit: null });
  });

  test("sin curso: vacío, no terminado", () => {
    expect(summarizeCourse(null)).toMatchObject({
      lessonCount: 0,
      current: null,
      finished: false,
    });
  });
});

test("toLessonStatus: lo desconocido queda bloqueado", () => {
  expect(toLessonStatus("available")).toBe("available");
  expect(toLessonStatus("otro")).toBe("locked");
});

test("pickCurrentStyle: el por defecto, si no el elegido, si no el primero", () => {
  const a = style({ id: "a", chosen: false });
  const b = style({ id: "b", chosen: true });
  expect(pickCurrentStyle([a, b], "a")?.id).toBe("a");
  expect(pickCurrentStyle([a, b], "zzz")?.id).toBe("b");
  expect(pickCurrentStyle([a], null)?.id).toBe("a");
  expect(pickCurrentStyle([], "a")).toBeNull();
});

test("styleProgressLine: rol solo si el estilo tiene roles", () => {
  expect(styleProgressLine(style(), "leader")).toBe("Líder · 2 de 6 lecciones");
  expect(styleProgressLine(style({ hasRoles: false }), "follower")).toBe(
    "2 de 6 lecciones",
  );
  expect(styleProgressLine(style({ hasCourse: false }), "follower")).toBe(
    "Seguidor · Curso en preparación",
  );
});

test("reviewMinutes: ~1 por paso, mínimo 3", () => {
  expect(reviewMinutes(1)).toBe(3);
  expect(reviewMinutes(8)).toBe(8);
});

test("relativeDays", () => {
  const now = new Date("2026-09-30T12:00:00Z");
  expect(relativeDays("2026-09-30T01:00:00Z", now)).toBe("hoy");
  expect(relativeDays("2026-09-29T23:00:00Z", now)).toBe("ayer");
  expect(relativeDays("2026-09-27T12:00:00Z", now)).toBe("hace 3 días");
  expect(relativeDays("2026-09-10T12:00:00Z", now)).toBe("hace 2 semanas");
  expect(relativeDays("2026-07-01T12:00:00Z", now)).toBe("hace más de un mes");
});

test("stepNamesLine", () => {
  const s = (...names: string[]) => names.map((name) => ({ name }));
  expect(stepNamesLine(s("Guapea"))).toBe("Guapea");
  expect(stepNamesLine(s("Guapea", "Enchufla"))).toBe("Guapea y Enchufla");
  expect(stepNamesLine(s("A", "B", "C"))).toBe("A, B y C");
  expect(stepNamesLine(s("A", "B", "C", "D", "E"))).toBe("A, B, C y 2 más");
});
