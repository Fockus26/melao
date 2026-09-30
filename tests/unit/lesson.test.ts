// La lección (/app/lessons/[id]): etapas, minutos (D097), calificación, errores de las Edge
// Functions y el adaptador sesión → escenario (motor falso).
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DAY_MS,
  SAMPLE_LESSON,
  SAMPLE_NOW,
} from "@/app/layouts/lesson/sample-data";
import { lessonCopy } from "@/components/lesson/copy";
import { LessonIntro } from "@/components/lesson/lesson-intro";
import { LessonLocked } from "@/components/lesson/lesson-locked";
import { LessonSummary } from "@/components/lesson/lesson-summary";
import {
  buildReviewRequest,
  canSubmitRatings,
  estimateMinutes,
  isStepDue,
  type LessonData,
  type LessonStage,
  nextStage,
  parsePlanSession,
  parseReviewCards,
  practiceProblem,
  practiceSongId,
  ratingProblem,
  returnDates,
  returnDay,
  reviewRole,
  stageKey,
  stageNumber,
} from "@/lib/lesson/lesson";
import { isUuid } from "@/lib/lesson/queries";
import { createFakeStageSource } from "@/lib/stage/fake-source";
import {
  anchorsFromEvents,
  SESSION_INTRO_MS,
  SESSION_OUTRO_MS,
  sessionStage,
  UNKNOWN_STEP,
} from "@/lib/stage/session-source";
import { constantGrid } from "@/supabase/functions/_shared/core/grid";
import { SALSA_CASINO } from "@/supabase/functions/_shared/core/style";
import { buildTimeline } from "@/supabase/functions/_shared/core/timeline";

const lesson = (over: Partial<LessonData> = {}): LessonData => ({
  ...SAMPLE_LESSON,
  ...over,
});
const now = new Date(SAMPLE_NOW);

describe("etapas", () => {
  test("intro → video/mini por paso → final → calificación → resumen", () => {
    const seen: string[] = [];
    let s: LessonStage = { kind: "intro" };
    while (s.kind !== "summary") {
      seen.push(`${stageKey(s)}:${stageNumber(s)}`);
      s = nextStage(s, 2);
    }
    seen.push(`${stageKey(s)}:${stageNumber(s)}`);
    expect(seen).toEqual([
      "intro:1",
      "video-0:2",
      "mini-0:3",
      "video-1:2",
      "mini-1:3",
      "final:4",
      "rating:5",
      "summary:6",
    ]);
  });

  test("sin pasos, de la intro a la final", () => {
    expect(nextStage({ kind: "intro" }, 0)).toEqual({ kind: "final" });
  });
});

describe("canción de cada práctica", () => {
  test("mini = práctica (o final); final = final (o práctica)", () => {
    const l = lesson({ practiceSongId: "p", finalSongId: "f" });
    expect(practiceSongId(l, "mini")).toBe("p");
    expect(practiceSongId(l, "final")).toBe("f");
    expect(
      practiceSongId(
        lesson({ practiceSongId: null, finalSongId: "f" }),
        "mini",
      ),
    ).toBe("f");
    expect(
      practiceSongId(
        lesson({ practiceSongId: "p", finalSongId: null }),
        "final",
      ),
    ).toBe("p");
    expect(
      practiceSongId(
        lesson({ practiceSongId: null, finalSongId: null }),
        "mini",
      ),
    ).toBeNull();
  });
});

describe("estimateMinutes (D097)", () => {
  test("mini prácticas + canción final + videos, hacia arriba", () => {
    // 160 BPM: 375 ms por beat. Mini = (1 + 4) frases × 8 × 375 = 15 s por paso.
    // 2 pasos = 30 s + final 195 s = 225 s → 4 min.
    expect(estimateMinutes(lesson())).toBe(4);
    const withVideos = lesson({
      steps: SAMPLE_LESSON.steps.map((s) => ({
        ...s,
        videos: { leader: 60_000, follower: 90_000 },
      })),
    });
    // + 2 × 60 s del rol del alumno = 345 s → 6 min.
    expect(estimateMinutes(withVideos)).toBe(6);
  });

  test("sin la canción (no visible para el alumno) o sin su ritmo, se omite", () => {
    expect(estimateMinutes(lesson({ songs: [] }))).toBeNull();
    const song = SAMPLE_LESSON.songs[0];
    expect(
      estimateMinutes(
        lesson({ songs: [{ ...song, bpm: null, beatGrid: null }] }),
      ),
    ).toBeNull();
    // Sin BPM pero con rejilla: el ritmo sale de las anclas.
    expect(estimateMinutes(lesson({ songs: [{ ...song, bpm: null }] }))).toBe(
      4,
    );
  });
});

describe("calificación", () => {
  const steps = SAMPLE_LESSON.steps;

  test("vence: sin tarjeta o con due_at ≤ ahora", () => {
    expect(isStepDue({ dueAt: null }, now)).toBe(true);
    expect(isStepDue({ dueAt: "2026-09-30T14:00:00.000Z" }, now)).toBe(true);
    expect(isStepDue({ dueAt: "2026-10-04T15:00:00.000Z" }, now)).toBe(false);
  });

  test("enviar: todo calificado o saltado y al menos uno calificado", () => {
    expect(canSubmitRatings(steps, {})).toBe(false);
    expect(canSubmitRatings(steps, { "vuelta-derecha": 3 })).toBe(false);
    expect(
      canSubmitRatings(steps, { "vuelta-derecha": 3, enchufla: "skip" }),
    ).toBe(true);
    expect(
      canSubmitRatings(steps, { "vuelta-derecha": "skip", enchufla: "skip" }),
    ).toBe(false);
  });

  test("review-steps: context lesson, sesión final, sin los saltados, rol si hay roles", () => {
    const req = buildReviewRequest(
      lesson(),
      "s1",
      { "vuelta-derecha": 2, enchufla: "skip" },
      now,
    );
    expect(req).toEqual({
      context: "lesson",
      sessionId: "s1",
      lessonId: SAMPLE_LESSON.id,
      reviews: [
        {
          stepId: "vuelta-derecha",
          role: "leader",
          rating: 2,
          reviewedAt: SAMPLE_NOW,
        },
      ],
    });
    const roleless = buildReviewRequest(
      lesson({ hasRoles: false }),
      "s1",
      { "vuelta-derecha": 4, enchufla: 1 },
      now,
    );
    expect(roleless.reviews.map((r) => "role" in r)).toEqual([false, false]);
    expect(reviewRole(lesson({ role: null }))).toBeUndefined();
  });

  test("fechas de regreso: la tarjeta del rol; el saltado conserva la suya", () => {
    const dates = returnDates(lesson(), [
      { stepId: "vuelta-derecha", role: "follower", dueAt: "x" },
      { stepId: "vuelta-derecha", role: "leader", dueAt: "2026-10-02" },
    ]);
    expect(dates).toEqual([
      {
        stepId: "vuelta-derecha",
        name: "Vuelta a la derecha",
        dueAt: "2026-10-02",
      },
      {
        stepId: "enchufla",
        name: "Enchufla",
        dueAt: "2026-10-04T15:00:00.000Z",
      },
    ]);
  });

  test("returnDay por días de calendario en la zona dada", () => {
    const tz = "America/Mexico_City";
    const at = (days: number) =>
      new Date(now.getTime() + days * DAY_MS).toISOString();
    expect(returnDay(at(0), now, tz)).toBe("today");
    expect(returnDay(at(1), now, tz)).toBe("tomorrow");
    expect(returnDay(at(2), now, tz)).toEqual({ date: "viernes 2 de octubre" });
    expect(returnDay(null, now, tz)).toBeNull();
  });
});

describe("respuestas y errores de las Edge Functions", () => {
  const err = (status: number, code: string) => ({
    status,
    body: { error: { code, message: "…" } },
  });

  test("práctica: canción no disponible → pronto; plan; bloqueo; red; resto", () => {
    expect(practiceProblem(err(404, "song_not_found"))).toBe("soon");
    expect(practiceProblem(err(409, "song_not_ready"))).toBe("soon");
    expect(practiceProblem(err(409, "no_plan"))).toBe("soon");
    expect(practiceProblem(err(403, "no_active_subscription"))).toBe(
      "subscription",
    );
    expect(practiceProblem(err(403, "lesson_locked"))).toBe("locked");
    expect(practiceProblem({ status: 0, body: null })).toBe("offline");
    expect(practiceProblem(err(500, "internal"))).toBe("error");
    expect(practiceProblem({ status: 502, body: null })).toBe("error");
  });

  test("calificación: plan, red, resto", () => {
    expect(ratingProblem(err(403, "no_active_subscription"))).toBe(
      "subscription",
    );
    expect(ratingProblem({ status: 0, body: null })).toBe("offline");
    expect(ratingProblem(err(409, "session_lesson_mismatch"))).toBe("error");
  });

  test("parsePlanSession y parseReviewCards validan la forma", () => {
    expect(
      parsePlanSession({ sessionId: "s", plan: [], timeline: [] }),
    ).not.toBeNull();
    expect(parsePlanSession({ plan: [], timeline: [] })).toBeNull();
    expect(
      parsePlanSession({ sessionId: "s", plan: [{ stepId: 1 }], timeline: [] }),
    ).toBeNull();
    expect(
      parseReviewCards({
        cards: [{ stepId: "a", role: "leader", dueAt: "d" }],
      }),
    ).toHaveLength(1);
    expect(parseReviewCards({ cards: [{ stepId: "a" }] })).toBeNull();
    expect(parseReviewCards(null)).toBeNull();
  });

  test("isUuid", () => {
    expect(isUuid(SAMPLE_LESSON.id)).toBe(true);
    expect(isUuid("no-es-uuid")).toBe(false);
  });
});

describe("sesión → escenario (motor falso)", () => {
  const grid = constantGrid(160, 1500);
  const plan = [
    { stepId: "guapea", slug: "guapea", startPhrase: 1, phrases: 1 },
    { stepId: "enchufla", slug: "enchufla", startPhrase: 2, phrases: 2 },
  ];
  const timeline = buildTimeline(SALSA_CASINO, grid, plan);
  const input = {
    style: SALSA_CASINO,
    plan: plan.map(({ slug: _s, ...p }) => p),
    timeline,
    steps: SAMPLE_LESSON.stepNames,
    beatGrid: grid,
    songDurationMs: 210000,
  };

  test("ventana: de la entrada (−1 s) al final (+1,5 s), nombres del estilo", () => {
    const { session, startMs } = sessionStage(input);
    const end = timeline.findLast((e) => e.kind === "end");
    expect(startMs).toBe(timeline[0].tMs - SESSION_INTRO_MS);
    expect(session.timeline.durationMs).toBe(
      (end?.tMs ?? 0) + SESSION_OUTRO_MS,
    );
    expect(session.plan.map((p) => p.name)).toEqual(["Guapea", "Enchufla"]);
    const unknown = sessionStage({ ...input, steps: {} });
    expect(unknown.session.plan[0].name).toBe(UNKNOWN_STEP);
  });

  test("sin rejilla, las anclas salen de los eventos y dan los mismos beats", () => {
    const anchors = anchorsFromEvents(timeline);
    const { session } = sessionStage({ ...input, beatGrid: null });
    expect(session.timeline.anchors).toEqual(anchors);
    const withGrid = createFakeStageSource({
      session: sessionStage(input).session,
      startAtMs: 0,
      frozen: true,
      status: "paused",
    });
    expect(withGrid.getSnapshot().view.section).toBe("intro");
    // En el primer evento de cada paso, las dos rejillas dicen el mismo paso y tiempo.
    for (const e of timeline.filter((ev) => ev.kind === "stepStart")) {
      const a = createFakeStageSource({
        session: sessionStage(input).session,
        startAtMs: e.tMs + 1,
        status: "paused",
      }).getSnapshot().view;
      const b = createFakeStageSource({
        session,
        startAtMs: e.tMs + 1,
        status: "paused",
      }).getSnapshot().view;
      expect(b.current?.stepId).toBe(a.current?.stepId ?? "");
      expect(b.beatInPhrase).toBe(a.beatInPhrase ?? 0);
    }
  });

  test("Reiniciar vuelve al inicio de la ventana, no al 0 de la canción", () => {
    const { session, startMs } = sessionStage(input);
    let t = 0;
    const source = createFakeStageSource({
      session,
      startAtMs: startMs,
      status: "blocked",
      now: () => t,
      requestFrame: () => null,
      cancelFrame: () => {},
    });
    expect(source.getSnapshot().view.positionMs).toBe(startMs);
    source.play();
    t = 3000;
    source.pause();
    expect(source.getSnapshot().view.positionMs).toBe(startMs + 3000);
    source.restart();
    expect(source.getSnapshot().view.positionMs).toBe(startMs);
  });

  test("sin eventos, lanza", () => {
    expect(() => sessionStage({ ...input, timeline: [] })).toThrow();
  });
});

describe("pantallas estáticas", () => {
  const html = (el: Parameters<typeof renderToStaticMarkup>[0]) =>
    renderToStaticMarkup(el);

  test("intro: eyebrow, título, pasos y minutos; sin datos, sin minutos", () => {
    const out = html(
      createElement(LessonIntro, { lesson: lesson(), onStart: () => {} }),
    );
    expect(out).toContain("Lección 3");
    expect(out).toContain("Primeras vueltas");
    // Enchufla ya tiene tarjeta: "2 pasos" (no "nuevos").
    expect(out).toContain("2 pasos · unos 4 minutos");
    expect(out).toContain("<ol");
    const noSongs = html(
      createElement(LessonIntro, {
        lesson: lesson({ songs: [] }),
        onStart: () => {},
      }),
    );
    expect(noSongs).not.toContain("minutos");
  });

  test("resumen: fechas, siguiente lección y volver al curso", () => {
    const out = html(
      createElement(LessonSummary, {
        lesson: lesson(),
        dates: [
          {
            stepId: "a",
            name: "Vuelta a la derecha",
            dueAt: "2026-10-01T15:00:00.000Z",
          },
        ],
        now,
        timeZone: "America/Mexico_City",
        courseHref: "/app/course",
        lessonHref: (id) => `/app/lessons/${id}`,
      }),
    );
    expect(out).toContain(lessonCopy.returnsTomorrow);
    expect(out).toContain("Empezar lección 4");
    expect(out).toContain(`/app/lessons/${SAMPLE_LESSON.next?.id}`);
    expect(out).toContain(lessonCopy.backToCourse);
    const last = html(
      createElement(LessonSummary, {
        lesson: lesson({ next: null }),
        dates: [],
        now,
        courseHref: "/app/course",
        lessonHref: (id) => id,
      }),
    );
    expect(last).toContain(lessonCopy.courseDone);
  });

  test("bloqueada: motivo y volver al curso, la X enlaza al curso", () => {
    const out = html(
      createElement(LessonLocked, {
        title: "Primeras vueltas",
        number: 3,
        courseHref: "/app/course",
      }),
    );
    expect(out).toContain(lessonCopy.lockedTitle);
    expect(out).toContain('aria-label="Salir de la lección"');
    expect(out).toContain('href="/app/course"');
  });
});
