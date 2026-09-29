/**
 * `stageViewAt` contra los vectores de la línea de tiempo (`docs/spec/vectors/timeline-*.json`):
 * en el `tMs` de cada evento, la vista tiene que decir lo mismo que el evento. Y el motor falso
 * con reloj inyectado.
 */

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createFakeStageSource,
  FAKE_STEPS,
  fakeSession,
} from "@/lib/stage/fake-source";
import {
  activeBeatAt,
  formatClock,
  type StagePlanItem,
  silentBeatsOf,
  stageViewAt,
} from "@/lib/stage/view";
import type { Anchor } from "@/supabase/functions/_shared/core/grid.ts";
import type { StyleConfig } from "@/supabase/functions/_shared/core/style.ts";
import {
  buildTimeline,
  type PlanItem,
} from "@/supabase/functions/_shared/core/timeline.ts";

const DIR = join(import.meta.dir, "../../docs/spec/vectors");

interface TimelineVector {
  descripcion: string;
  entrada: { style: StyleConfig; anchors: Anchor[]; plan: PlanItem[] };
}

const vectors: [string, TimelineVector][] = readdirSync(DIR)
  .filter((f) => f.startsWith("timeline-") && f.endsWith(".json"))
  .map((f) => [f, JSON.parse(readFileSync(join(DIR, f), "utf8"))]);

describe("stageViewAt con los vectores de la línea de tiempo", () => {
  test("hay vectores", () => {
    expect(vectors.length).toBeGreaterThan(0);
  });

  for (const [file, v] of vectors) {
    test(`${file}: cada evento coincide con la vista`, () => {
      const { style, anchors } = v.entrada;
      const plan: StagePlanItem[] = v.entrada.plan.map((p) => ({
        ...p,
        name: p.slug,
      }));
      const events = buildTimeline(style, anchors, plan);
      const end = events[events.length - 1];
      const timeline = {
        style,
        anchors,
        events,
        durationMs: end.tMs + 1000,
      };

      for (const e of events) {
        const view = stageViewAt(timeline, plan, e.tMs);
        if (e.kind === "end") {
          expect(view.section).toBe("end");
          expect(view.next).toBeNull();
          continue;
        }
        expect(view.beat).toBe(e.beat);
        expect(view.beatInPhrase).toBe(e.beatInPhrase);
        expect(view.silent).toBe(!style.spokenBeats.includes(e.beatInPhrase));
        if (e.kind === "count" || e.kind === "stepStart") {
          expect(view.current?.stepId ?? null).toBe(e.stepId);
        }
        if (e.kind === "stepStart") expect(view.announced).toBe(false);
        if (e.kind === "call") {
          expect(view.announced).toBe(true);
          expect(view.next?.stepId).toBe(e.stepId as string);
          expect(view.repeats).toBe(false);
          // Un ms antes todavía no se anunció.
          expect(stageViewAt(timeline, plan, e.tMs - 1).announced).toBe(false);
        }
      }
      // Antes del primer evento: intro, sin tiempo.
      const intro = stageViewAt(timeline, plan, events[0].tMs - 1);
      expect(intro.section).toBe("intro");
      expect(intro.beat).toBeNull();
      expect(intro.next?.stepId).toBe(plan[0].stepId);
    });
  }
});

describe("stageViewAt con el plan de la muestra", () => {
  const { timeline, plan } = fakeSession();
  const at = (beat: number) =>
    stageViewAt(
      timeline,
      plan,
      Math.floor(timeline.anchors[0].tMs + beat * (60000 / 184)) + 5,
    );

  test("entrada: frase 1 de 1, anuncia Guapea en el 5", () => {
    expect(at(-8).section).toBe("leadIn");
    expect(at(-8).phrase).toEqual({ index: 1, count: 1 });
    expect(at(-5).announced).toBe(false);
    expect(at(-4).announced).toBe(true);
    expect(at(-4).next?.name).toBe("Guapea");
  });

  test("Guapea repetida: SE REPITE, sin anuncio", () => {
    const v = at(12);
    expect(v.current?.name).toBe("Guapea");
    expect(v.phrase).toEqual({ index: 2, count: 2 });
    expect(v.repeats).toBe(true);
    expect(v.announced).toBe(false);
    expect(v.next?.name).toBe("Guapea");
    expect(v.later.map((s) => s.name)).toEqual([
      "Enchufla",
      "Dile que no",
      "Sombrero",
    ]);
    // En Guapea (1.ª frase) "Después" salta la repetición: Guapea → Enchufla → …
    expect(at(0).later.map((s) => s.name)).toEqual([
      "Enchufla",
      "Dile que no",
      "Sombrero",
    ]);
  });

  test("anuncio de Enchufla desde el 5 de la última frase", () => {
    expect(at(19).announced).toBe(false);
    const v = at(20);
    expect(v.announced).toBe(true);
    expect(v.next?.name).toBe("Enchufla");
    expect(at(24).current?.name).toBe("Enchufla");
    expect(at(24).announced).toBe(false);
  });

  test("4 y 8 son silenciosos; último paso sin siguiente", () => {
    expect(at(3).silent).toBe(true);
    expect(at(7).silent).toBe(true);
    expect(at(4).silent).toBe(false);
    const last = at(60);
    expect(last.current?.name).toBe("Setenta");
    expect(last.next).toBeNull();
    expect(last.later).toEqual([]);
  });

  test("después del final y posición acotada", () => {
    const v = stageViewAt(timeline, plan, timeline.durationMs + 5000);
    expect(v.section).toBe("end");
    expect(v.positionMs).toBe(timeline.durationMs);
  });
});

describe("utilidades", () => {
  test("formatClock", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(102_400)).toBe("1:42");
    expect(formatClock(245_000)).toBe("4:05");
    expect(formatClock(-50)).toBe("0:00");
  });

  test("silentBeatsOf", () => {
    expect(silentBeatsOf(fakeSession().timeline.style)).toEqual([4, 8]);
  });

  test("activeBeatAt cambia en el ms redondeado del beat", () => {
    const anchors = [
      { beat: 0, tMs: 0 },
      { beat: 1, tMs: 312.5 },
    ];
    expect(activeBeatAt(anchors, 312)).toBe(0);
    expect(activeBeatAt(anchors, 313)).toBe(1);
    expect(activeBeatAt(anchors, -1)).toBe(-1);
  });
});

describe("motor falso", () => {
  const clock = () => {
    let t = 0;
    const frames: (() => void)[] = [];
    return {
      now: () => t,
      advance(ms: number) {
        t += ms;
        const run = frames.splice(0);
        for (const f of run) f();
      },
      requestFrame: (cb: () => void) => frames.push(cb),
      cancelFrame: () => {
        frames.length = 0;
      },
    };
  };

  test("preparando → bloqueado → reproduciendo → pausa", () => {
    const c = clock();
    const src = createFakeStageSource({
      status: "preparing",
      prepareMs: 1000,
      ...c,
    });
    const unsub = src.subscribe(() => {});
    c.advance(500);
    const s = src.getSnapshot().status;
    expect(s.kind).toBe("preparing");
    expect(s.kind === "preparing" && s.progress).toBe(0.5);
    c.advance(600);
    expect(src.getSnapshot().status.kind).toBe("blocked");
    src.play();
    expect(src.getSnapshot().status.kind).toBe("playing");
    c.advance(3000);
    const pos = src.getSnapshot().view.positionMs;
    expect(pos).toBe(3000);
    src.pause();
    c.advance(2000);
    expect(src.getSnapshot().view.positionMs).toBe(3000);
    expect(src.getSnapshot().status.kind).toBe("paused");
    unsub();
  });

  test("instantánea: no avanza; reiniciar vuelve a 0; voz", () => {
    const c = clock();
    const src = createFakeStageSource({
      status: "playing",
      frozen: true,
      startAtBeat: 20,
      ...c,
    });
    src.subscribe(() => {});
    const before = src.getSnapshot();
    c.advance(1000);
    expect(src.getSnapshot()).toBe(before);
    expect(before.view.announced).toBe(true);
    src.setVoice(false);
    expect(src.getSnapshot().voice).toBe(false);
    src.restart();
    expect(src.getSnapshot().view.positionMs).toBe(0);
    expect(src.getSnapshot().view.section).toBe("intro");
  });

  test("llega al final", () => {
    const c = clock();
    const src = createFakeStageSource({ status: "playing", ...c });
    src.subscribe(() => {});
    c.advance(fakeSession().timeline.durationMs + 1);
    expect(src.getSnapshot().status.kind).toBe("ended");
    src.play();
    expect(src.getSnapshot().view.positionMs).toBe(0);
  });

  test("el plan de la muestra tiene un paso repetido", () => {
    expect(FAKE_STEPS[0].stepId).toBe(FAKE_STEPS[1].stepId);
  });
});
