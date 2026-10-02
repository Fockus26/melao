// Progreso: la gráfica de próximos repasos, el estilo del enlace y la vista (sin reglas: viven
// en SQL, ver db-progress.test.ts).
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ProgressView,
  type ProgressViewProps,
} from "@/components/progress/progress-view";
import { ReviewForecastCard } from "@/components/progress/review-forecast";
import {
  type CoursePath,
  type LessonStatus,
  type StyleOption,
  summarizeCourse,
} from "@/lib/course/path";
import {
  forecastAriaLabel,
  forecastBars,
  forecastTotal,
  isFirstDay,
  PROGRESS_LINKS,
  pickProgressStyle,
  toStatusCounts,
} from "@/lib/progress/progress";

// 2026-10-02 es viernes.
const WEEK = [3, 0, 1, 6, 0, 0, 2].map((dueCount, i) => ({
  day: `2026-10-0${2 + i}`,
  dueCount,
}));

describe("forecastBars", () => {
  test("hoy primero, días por la fecha (no por el reloj) y alto relativo al máximo", () => {
    const bars = forecastBars(WEEK);
    expect(bars.map((b) => b.shortLabel)).toEqual([
      "Hoy",
      "sáb",
      "dom",
      "lun",
      "mar",
      "mié",
      "jue",
    ]);
    expect(bars.map((b) => b.isToday)).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(bars.map((b) => b.ratio)).toEqual([0.5, 0, 1 / 6, 1, 0, 0, 1 / 3]);
  });

  test("sin repasos: todo en cero, sin dividir por cero", () => {
    const bars = forecastBars(WEEK.map((d) => ({ ...d, dueCount: 0 })));
    expect(bars.every((b) => b.ratio === 0 && b.count === 0)).toBe(true);
    expect(forecastTotal(WEEK)).toBe(12);
  });

  test("el nombre accesible enumera los 7 días con su número", () => {
    expect(forecastAriaLabel(forecastBars(WEEK))).toBe(
      "Repasos por día, de hoy a 7 días: hoy, 3 repasos; sábado, ninguno; domingo, 1 repaso; lunes, 6 repasos; martes, ninguno; miércoles, ninguno; jueves, 2 repasos.",
    );
  });

  test("el día de la semana no depende de la zona del proceso", () => {
    // Una fecha `YYYY-MM-DD` se lee a mediodía UTC: sigue siendo viernes en cualquier zona.
    expect(
      forecastBars([{ day: "2026-10-09", dueCount: 1 }])[0].longLabel,
    ).toBe("hoy");
    expect(
      forecastBars([
        { day: "2026-10-08", dueCount: 0 },
        { day: "2026-10-09", dueCount: 1 },
      ])[1].longLabel,
    ).toBe("viernes");
  });
});

const style = (id: string, name: string, done = 0): StyleOption => ({
  id,
  name,
  hasRoles: true,
  chosen: true,
  hasCourse: true,
  lessonCount: 6,
  completedCount: done,
});
const SALSA = style("salsa", "Salsa casino", 2);
const MERENGUE = style("merengue", "Merengue");

describe("estilo y datos", () => {
  test("?style= si es un estilo publicado; si no, el actual", () => {
    expect(pickProgressStyle([SALSA, MERENGUE], "merengue", SALSA)).toBe(
      MERENGUE,
    );
    expect(pickProgressStyle([SALSA, MERENGUE], "otro", SALSA)).toBe(SALSA);
    expect(pickProgressStyle([SALSA, MERENGUE], undefined, SALSA)).toBe(SALSA);
    expect(pickProgressStyle([], undefined, null)).toBeNull();
  });

  test("conteos por estado; sin fila, en cero", () => {
    expect(
      toStatusCounts({
        unknown_count: 5,
        learning_count: 2,
        known_count: 1,
        total: 8,
      }),
    ).toEqual({ unknown: 5, learning: 2, known: 1, total: 8 });
    expect(toStatusCounts(undefined)).toEqual({
      unknown: 0,
      learning: 0,
      known: 0,
      total: 0,
    });
  });

  test("primer día: nada completado, marcado, difícil ni practicado", () => {
    const zero = { unknown: 8, learning: 0, known: 0, total: 8 };
    const base = {
      completedLessons: 0,
      counts: zero,
      hardestCount: 0,
      sessionCount: 0,
    };
    expect(isFirstDay(base)).toBe(true);
    expect(isFirstDay({ ...base, sessionCount: 1 })).toBe(false);
    expect(isFirstDay({ ...base, completedLessons: 1 })).toBe(false);
    expect(isFirstDay({ ...base, counts: { ...zero, known: 1 } })).toBe(false);
  });

  test("enlaces: practicar estos en modo repaso del estilo; resultado de una libre", () => {
    expect(PROGRESS_LINKS.practiceReview("salsa")).toBe(
      "/app/practice?style=salsa&mode=review",
    );
    expect(PROGRESS_LINKS.result("abc")).toBe("/app/practice/result?id=abc");
    expect(PROGRESS_LINKS.progress()).toBe("/app/progress");
    expect(PROGRESS_LINKS.progress("salsa")).toBe("/app/progress?style=salsa");
  });
});

const path = (done: number): CoursePath => ({
  courseId: "c",
  lessonCount: 6,
  lessons: Array.from({ length: 6 }, (_, i) => ({
    unitId: "u1",
    unitPosition: 1,
    unitTitle: "Fundamentos",
    lessonId: `l${i + 1}`,
    lessonPosition: i + 1,
    number: i + 1,
    title: `Lección ${i + 1}`,
    stepCount: 2,
    status: (i < done
      ? "completed"
      : i === done
        ? "current"
        : "locked") as LessonStatus,
  })),
});

const NOW = new Date("2026-10-02T15:00:00Z");
const props = (over: Partial<ProgressViewProps> = {}): ProgressViewProps => ({
  styles: [SALSA, MERENGUE],
  style: SALSA,
  course: summarizeCourse(path(2)),
  counts: { unknown: 5, learning: 2, known: 1, total: 8 },
  hardest: [
    {
      id: "h1",
      slug: "enchufla",
      name: "Enchufla",
      difficulty: 2,
      lastRating: 1,
      lastReviewedAt: "2026-09-30T10:00:00Z",
    },
  ],
  sessions: [
    {
      id: "free-1",
      mode: "free",
      styleName: "Salsa casino",
      songTitle: "Pista de prueba",
      lessonTitle: null,
      createdAt: "2026-10-02T10:00:00Z",
    },
    {
      id: "lesson-1",
      mode: "lesson",
      styleName: "Salsa casino",
      songTitle: null,
      lessonTitle: "La guapea",
      createdAt: "2026-10-01T10:00:00Z",
    },
  ],
  now: NOW,
  forecast: createElement(ReviewForecastCard, {
    state: { status: "ready", days: WEEK },
  }),
  ...over,
});
const render = (p: ProgressViewProps) =>
  renderToStaticMarkup(createElement(ProgressView, p));

describe("ProgressView", () => {
  test("con datos: lecciones, 3 cifras por estado, gráfica, practicar estos y sesiones", () => {
    const html = render(props());
    expect(html).toContain("de 6 lecciones completadas");
    expect(html).toContain('aria-valuetext="2 de 6 lecciones"');
    expect(html).toContain("No lo sé");
    expect(html).toContain("Aprendiendo");
    expect(html).toContain("Me lo sé");
    expect(html).toContain('role="img"');
    expect(html).toContain("hoy, 3 repasos");
    expect(html).toContain('href="/app/practice?style=salsa&amp;mode=review"');
    expect(html).toContain("Practicar estos");
    // La libre enlaza a su resultado; la de lección no enlaza.
    expect(html).toContain('href="/app/practice/result?id=free-1"');
    expect(html).not.toContain("id=lesson-1");
    expect(html).toContain("Lección · La guapea · Salsa casino · ayer");
    expect(html).toContain("Canción no disponible");
    // Otro estilo: enlace con `?style=`, el actual marcado.
    expect(html).toContain('href="/app/progress?style=merengue"');
    expect(html).toContain('aria-current="page"');
  });

  test("primer día: invita a la lección 1", () => {
    const html = render(
      props({
        course: summarizeCourse(path(0)),
        counts: { unknown: 8, learning: 0, known: 0, total: 8 },
        hardest: [],
        sessions: [],
      }),
    );
    expect(html).toContain("Empezar la lección 1");
    expect(html).toContain('href="/app/lessons/l1"');
    expect(html).not.toContain("Practicar estos");
    expect(html).toContain("Todavía no hay sesiones");
  });

  test("con un solo estilo no hay selector; sin curso lo dice", () => {
    const html = render(props({ styles: [SALSA], course: null }));
    expect(html).not.toContain('aria-label="Estilo"');
    expect(html).toContain("Salsa casino todavía no tiene curso.");
  });
});

describe("ReviewForecastCard", () => {
  const card = (state: Parameters<typeof ReviewForecastCard>[0]["state"]) =>
    renderToStaticMarkup(
      createElement(ReviewForecastCard, { state, onRetry: () => {} }),
    );

  test("cargando: aria-busy y texto para lectores", () => {
    const html = card({ status: "loading" });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Cargando tus próximos repasos");
  });

  test("error: Reintentar", () => {
    expect(card({ status: "error" })).toContain("Reintentar");
  });

  test("sin repasos en 7 días: texto, sin gráfica", () => {
    const html = card({
      status: "ready",
      days: WEEK.map((d) => ({ ...d, dueCount: 0 })),
    });
    expect(html).toContain("Nada vence en los próximos 7 días");
    expect(html).not.toContain('role="img"');
  });

  test("con repasos: número encima de cada barra y 'Hoy' en 600", () => {
    const html = card({ status: "ready", days: WEEK });
    expect(html).toContain("12 repasos en 7 días");
    expect(html.match(/tabular-nums/g)).toHaveLength(7);
    expect(html).toMatch(/font-semibold[^"]*">Hoy</);
  });
});
