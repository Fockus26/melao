// Resultado de la práctica (/app/practice/result): obligatorios y opcionales, cuándo se puede
// guardar, el cuerpo de review-steps (context practice), lo guardado y el render de los estados.
import { describe, expect, mock, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  PracticeResultData,
  ResultStep,
} from "@/lib/practice-result/result";
import {
  buildPracticeReview,
  dancedMs,
  dancedPhrases,
  resultLines,
  saveBlocker,
  splitSteps,
} from "@/lib/practice-result/result";
import { constantGrid } from "@/supabase/functions/_shared/core/grid";
import { SALSA_CASINO } from "@/supabase/functions/_shared/core/style";
import { buildTimeline } from "@/supabase/functions/_shared/core/timeline";

// El componente usa `useRouter` (refresh al guardar): fuera del App Router, uno falso.
// `mock.module` es global en bun: se conserva el resto del módulo real para no romper otros tests.
const navigation = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navigation,
  useRouter: () => ({ refresh() {}, push() {}, replace() {} }),
}));
const { PracticeResult } = await import(
  "@/components/practice-result/practice-result"
);

const NOW = new Date("2026-10-01T15:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString();

const step = (id: string, dueInDays: number | null): ResultStep => ({
  id,
  name: `Paso ${id}`,
  phrases: 1,
  dueAt: dueInDays === null ? null : at(dueInDays),
});

// a vencido, b sin tarjeta (vence), c y d no vencen hoy.
const STEPS = [step("a", -2), step("b", null), step("c", 3), step("d", 0.5)];

const DATA: PracticeResultData = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  styleId: "a0000000-0000-4000-8000-000000000001",
  styleName: "Salsa casino",
  songId: "c0000000-0000-4000-8000-000000000002",
  songTitle: "Pista de prueba 2 · casino medio",
  hasRoles: true,
  role: "follower",
  durationMs: 170_000,
  phrases: 14,
  steps: STEPS,
  saved: null,
};

describe("splitSteps", () => {
  test("vencido o sin tarjeta = obligatorio; due_at futuro = opcional", () => {
    const { due, optional } = splitSteps(STEPS, NOW);
    expect(due.map((s) => s.id)).toEqual(["a", "b"]);
    expect(optional.map((s) => s.id)).toEqual(["c", "d"]);
  });

  test("due_at exactamente ahora vence", () => {
    expect(splitSteps([step("x", 0)], NOW).due).toHaveLength(1);
  });
});

describe("saveBlocker", () => {
  test("cuenta los vencidos sin calificar", () => {
    expect(saveBlocker(STEPS, {}, NOW)).toEqual({ kind: "due", missing: 2 });
    expect(saveBlocker(STEPS, { a: 3, c: 4 }, NOW)).toEqual({
      kind: "due",
      missing: 1,
    });
  });

  test("con los vencidos calificados se puede, aunque falten opcionales", () => {
    expect(saveBlocker(STEPS, { a: 3, b: 1 }, NOW)).toBeNull();
  });

  test("sin vencidos exige al menos una calificación", () => {
    const steps = [step("c", 3), step("d", 1)];
    expect(saveBlocker(steps, {}, NOW)).toEqual({ kind: "none" });
    expect(saveBlocker(steps, { d: 2 }, NOW)).toBeNull();
  });
});

describe("buildPracticeReview", () => {
  const when = new Date("2026-10-01T15:30:00Z");

  test("context practice + sessionId, solo los calificados, en el orden de la sesión", () => {
    const body = buildPracticeReview(DATA, { c: 4, a: 3, b: 1 }, when);
    expect(body).toEqual({
      context: "practice",
      sessionId: DATA.sessionId,
      reviews: [
        {
          stepId: "a",
          role: "follower",
          rating: 3,
          reviewedAt: when.toISOString(),
        },
        {
          stepId: "b",
          role: "follower",
          rating: 1,
          reviewedAt: when.toISOString(),
        },
        {
          stepId: "c",
          role: "follower",
          rating: 4,
          reviewedAt: when.toISOString(),
        },
      ],
    });
  });

  test("estilo sin roles: sin `role` (review-steps usa leader)", () => {
    const body = buildPracticeReview(
      { ...DATA, hasRoles: false },
      { a: 2 },
      when,
    );
    expect(body.reviews).toEqual([
      { stepId: "a", rating: 2, reviewedAt: when.toISOString() },
    ]);
  });

  test("con roles y perfil sin rol: sin `role` (el servidor responde role_required)", () => {
    const body = buildPracticeReview({ ...DATA, role: null }, { a: 2 }, when);
    expect(body.reviews[0]).not.toHaveProperty("role");
  });

  test("es determinista: reenviar da el mismo cuerpo (idempotencia del servidor)", () => {
    const choices = { a: 3, b: 2 } as const;
    expect(buildPracticeReview(DATA, choices, when)).toEqual(
      buildPracticeReview(DATA, choices, when),
    );
  });
});

describe("resultLines", () => {
  test("fecha de la tarjeta del rol; sin tarjeta, la que tenía; sin calificar = null", () => {
    const lines = resultLines(
      DATA,
      [
        { stepId: "a", rating: 3 },
        { stepId: "b", rating: 1 },
      ],
      [
        { stepId: "a", role: "leader", dueAt: at(99) },
        { stepId: "a", role: "follower", dueAt: at(4) },
        { stepId: "b", role: "follower", dueAt: at(1) },
      ],
    );
    expect(lines.map((l) => [l.stepId, l.rating, l.dueAt])).toEqual([
      ["a", 3, at(4)],
      ["b", 1, at(1)],
      ["c", null, at(3)],
      ["d", null, at(0.5)],
    ]);
  });

  test("estilo sin roles: la tarjeta leader", () => {
    const [line] = resultLines(
      { ...DATA, hasRoles: false, steps: [step("a", -1)] },
      [{ stepId: "a", rating: 4 }],
      [{ stepId: "a", role: "leader", dueAt: at(8) }],
    );
    expect(line.dueAt).toBe(at(8));
  });
});

describe("duración y frases", () => {
  test("de la primera cuenta al fin de la línea de tiempo del core", () => {
    const plan = [
      { stepId: "s1", slug: "guapea", startPhrase: 1, phrases: 2 },
      { stepId: "s2", slug: "enchufla", startPhrase: 3, phrases: 1 },
    ];
    const events = buildTimeline(SALSA_CASINO, constantGrid(180, 2000), plan);
    const first = Math.min(...events.map((e) => e.tMs));
    const end = events.find((e) => e.kind === "end");
    expect(end).toBeDefined();
    expect(dancedMs(events)).toBe((end?.tMs ?? 0) - first);
    expect(dancedMs(events)).toBeGreaterThan(0);
    expect(dancedPhrases(plan)).toBe(3);
  });

  test("sin eventos o sin fin, 0", () => {
    expect(dancedMs([])).toBe(0);
    expect(dancedMs([{ tMs: 10, kind: "count" }])).toBe(0);
  });
});

describe("PracticeResult (render)", () => {
  const render = (data: PracticeResultData, extra = {}) =>
    renderToStaticMarkup(
      createElement(PracticeResult, {
        data,
        now: NOW.toISOString(),
        timeZone: "UTC",
        ...extra,
      }),
    );

  test("cabecera, 3 datos y X a Practicar", () => {
    const html = render(DATA);
    expect(html).toContain("<h1");
    expect(html).toContain("Pista de prueba 2 · casino medio");
    expect(html).toContain("Práctica terminada · Salsa casino");
    expect(html).toContain("2:50");
    expect(html).toContain(">14<");
    expect(html).toContain('href="/app/practice"');
    expect(html).toContain('aria-label="Cerrar y volver a Practicar"');
  });

  test("Otra vez → configurador con la misma canción y estilo", () => {
    const html = render(DATA);
    expect(html).toContain(
      `href="/app/practice?style=${DATA.styleId}&amp;song=${DATA.songId}"`,
    );
  });

  test("vencidos a la vista; opcionales plegados; Guardar deshabilitado con motivo", () => {
    const html = render(DATA);
    expect(html).toContain("Paso a");
    expect(html).toContain("y 2 más que no vencen hoy · ");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(/<div[^>]*hidden=""[^>]*>/);
    expect(html).toContain("Faltan calificar 2 pasos que vencen hoy.");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-describedby=/);
  });

  test("sin vencidos: los opcionales se ven y no hay pliegue", () => {
    const html = render({ ...DATA, steps: [step("c", 3), step("d", 1)] });
    expect(html).toContain("Hoy no te vencía ninguno");
    expect(html).not.toContain("aria-expanded");
    expect(html).not.toMatch(/hidden=""/);
    expect(html).toContain("Califica al menos un paso para guardar.");
  });

  test("ya calificada: lo guardado, sin formulario; Terminar → Inicio", () => {
    const html = render({ ...DATA, saved: [{ stepId: "a", rating: 3 }] });
    expect(html).toContain("Ya calificaste esta práctica");
    expect(html).toContain("Bien");
    expect(html).toContain("Sin calificar");
    expect(html).not.toContain('type="radio"');
    expect(html).toContain('href="/app"');
  });
});
