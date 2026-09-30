// Curso: agrupar el camino por unidad, dónde va el repaso y la vista (sin reglas: viven en SQL).
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CourseView, type CourseViewProps } from "@/components/app/course-view";
import { PathNode } from "@/components/indicators/path-node";
import type { CoursePath, LessonStatus } from "@/lib/course/path";
import { groupPathByUnit, reviewPlacement } from "@/lib/course/units";

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

const DUE = [
  { id: "s1", slug: "enchufla", name: "Enchufla" },
  { id: "s2", slug: "guapea", name: "Guapea" },
];

const count = (s: string, needle: string) => s.split(needle).length - 1;

describe("groupPathByUnit", () => {
  test("unidades en orden con sus completadas", () => {
    const units = groupPathByUnit(
      path(["completed", "completed", "current", "locked", "locked"]),
    );
    expect(units.map((u) => [u.id, u.lessons.length, u.done])).toEqual([
      ["u1", 3, 2],
      ["u2", 2, 0],
    ]);
  });

  test("sin camino: vacío", () => {
    expect(groupPathByUnit(null)).toEqual([]);
  });
});

describe("reviewPlacement", () => {
  test("antes de la lección actual, solo con vencidos", () => {
    const p = path(["completed", "current", "locked"]);
    expect(reviewPlacement(p, 3)).toEqual({ before: "l2" });
    expect(reviewPlacement(p, 0)).toBeNull();
  });

  test("curso terminado: al final", () => {
    expect(reviewPlacement(path(["completed", "completed"]), 1)).toBe("end");
  });

  test("sin camino: nada", () => {
    expect(reviewPlacement(null, 4)).toBeNull();
  });
});

describe("PathNode con acción compacta", () => {
  test("actual: un enlace con aria-label, ícono solo en móvil y texto desde 1024", () => {
    const out = renderToStaticMarkup(
      createElement(PathNode, {
        state: "current",
        number: 3,
        title: "Enchufla",
        label: "Lección 3",
        href: "/app/lessons/3",
        compactAction: true,
        actionAriaLabel: "Continuar lección 3: Enchufla",
      }),
    );
    expect(count(out, "<a")).toBe(1);
    expect(out).toContain('aria-label="Continuar lección 3: Enchufla"');
    expect(out).toContain("size-12");
    expect(out).toContain("rounded-pill");
    expect(out).toContain("max-lg:sr-only");
    expect(out).toContain("bg-gold-tint");
  });

  test("repaso: deja de ser fila-enlace y lleva su botón outline", () => {
    const out = renderToStaticMarkup(
      createElement(PathNode, {
        state: "review",
        number: 0,
        title: "Repaso de hoy",
        label: "2 pasos vencen hoy",
        href: "/app/practice?mode=review",
        compactAction: true,
        actionLabel: "Repasar",
        actionAriaLabel: "Repasar: 2 pasos vencen hoy",
      }),
    );
    expect(out.startsWith("<div")).toBe(true);
    expect(count(out, "<a")).toBe(1);
    expect(out).toContain('aria-label="Repasar: 2 pasos vencen hoy"');
    expect(out).toContain("border-border-input");
    expect(out).not.toContain("bg-gold-tint");
  });
});

// Sin estilos en el selector (el Sheet es de cliente y usa el router): solo el camino.
const base: CourseViewProps = {
  styles: [],
  currentStyle: {
    id: "salsa",
    name: "Salsa casino",
    hasRoles: true,
    chosen: true,
    hasCourse: true,
    lessonCount: 5,
    completedCount: 2,
  },
  role: "leader",
  subscribed: true,
  path: path(["completed", "completed", "current", "locked", "locked"]),
  due: DUE,
};
const view = (over: Partial<CourseViewProps> = {}) =>
  renderToStaticMarkup(createElement(CourseView, { ...base, ...over }));

describe("CourseView", () => {
  test("cabecera por unidad con x de y y un nodo por lección", () => {
    const out = view();
    expect(count(out, "<h2")).toBe(2);
    expect(out).toContain("Unidad 1");
    expect(out).toContain("2 de 3");
    expect(out).toContain("0 de 2");
    expect(count(out, 'data-slot="path-node"')).toBe(6);
  });

  test("repaso antes de la actual, con su acción a la práctica de repaso", () => {
    const out = view();
    const review = out.indexOf('data-state="review"');
    const current = out.indexOf('data-state="current"');
    expect(review).toBeGreaterThan(-1);
    expect(review).toBeLessThan(current);
    expect(out).toContain('href="/app/practice?mode=review"');
    expect(out).toContain('aria-label="Repasar: 2 pasos vencen hoy"');
    expect(out).toContain('aria-label="Continuar lección 3: Lección 3"');
  });

  test("sin vencidos no hay nodo de repaso", () => {
    expect(view({ due: [] })).not.toContain('data-state="review"');
  });

  test("bloqueadas sin enlace; completadas enlazan a su lección", () => {
    const out = view({ due: [] });
    expect(out).toContain('href="/app/lessons/l1"');
    expect(out).not.toContain('href="/app/lessons/l4"');
    expect(out).toContain("Lección 4 · Bloqueada");
  });

  test("sin suscripción: el camino se ve y repasar lleva a Planes", () => {
    const out = view({ subscribed: false });
    expect(out).not.toContain("mode=review");
    expect(out).toContain('href="/plans"');
    expect(out).toContain("Activa tu plan para repasar: 2 pasos vencen hoy");
    expect(out).toContain('href="/app/lessons/l3"');
  });

  test("primer día: Empezar en vez de Continuar", () => {
    const out = view({
      due: [],
      path: path(["current", "locked", "locked"]),
    });
    expect(out).toContain('aria-label="Empezar lección 1: Lección 1"');
  });

  test("terminado: aviso y repaso al final", () => {
    const out = view({ path: path(["completed", "completed", "completed"]) });
    expect(out).toContain("Terminaste el curso de Salsa casino.");
    expect(out.indexOf('data-state="review"')).toBeGreaterThan(
      out.lastIndexOf('data-state="completed"'),
    );
  });

  test("estilo sin curso y sin estilos", () => {
    expect(view({ path: null })).toContain(
      "Salsa casino todavía no tiene curso.",
    );
    expect(view({ currentStyle: null, path: null })).toContain(
      "Todavía no hay estilos publicados.",
    );
  });
});
