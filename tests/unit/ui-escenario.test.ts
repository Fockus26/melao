/** Piezas del escenario renderizadas a HTML: textos por estado, a11y y caja fija de la cuenta. */

import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LONG_STEPS } from "@/app/stage/demo-states";
import {
  stageAnnouncement,
  stageCopy,
  stepSummary,
} from "@/components/stage/copy";
import { Count } from "@/components/stage/count";
import { NextStep } from "@/components/stage/next-step";
import { ProgressBar } from "@/components/stage/progress-bar";
import { Stage } from "@/components/stage/stage";
import { StageControls } from "@/components/stage/stage-controls";
import { StatusChips } from "@/components/stage/status-chips";
import { UpcomingList } from "@/components/stage/upcoming-list";
import { createFakeStageSource } from "@/lib/stage/fake-source";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(el);
const step = (name: string) => ({ stepId: name.toLowerCase(), name });

describe("Count", () => {
  test("oculto al lector, caja fija de 120 y · en silencio", () => {
    const out = html(createElement(Count, { beat: 5, silent: false }));
    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain("w-30");
    expect(out).toContain(">5<");
    const silent = html(createElement(Count, { beat: 4, silent: true }));
    expect(silent).toContain("·");
    expect(silent).toContain("text-stage-beat-inactive");
  });
});

describe("NextStep", () => {
  const render = (v: {
    next: ReturnType<typeof step> | null;
    repeats: boolean;
    announced: boolean;
  }) => html(createElement(NextStep, { view: v }));

  test("antes del anuncio: SIGUIENTE, sin filete, ayuda reservada", () => {
    const out = render({
      next: step("Enchufla"),
      repeats: false,
      announced: false,
    });
    expect(out).toContain(`>${stageCopy.next}<`);
    expect(out).toContain('data-announced="false"');
    expect(out).toContain("invisible");
  });

  test("desde el 5: SIGUIENTE · EN EL 1 + filete 48 + entra en el 1", () => {
    const out = render({
      next: step("Enchufla"),
      repeats: false,
      announced: true,
    });
    expect(out).toContain(stageCopy.nextOnOne);
    expect(out).toContain("w-12");
    expect(out).toContain(stageCopy.entersOnOne);
    expect(out).not.toContain("invisible");
  });

  test("se repite: sin filete, con la ayuda", () => {
    const out = render({
      next: step("Guapea"),
      repeats: true,
      announced: false,
    });
    expect(out).toContain(stageCopy.repeats);
    expect(out).toContain(stageCopy.repeatsHint);
    expect(out).toContain('data-announced="false"');
  });

  test("nombres de 32 caracteres parten línea", () => {
    expect(LONG_STEPS[1].name).toHaveLength(32);
    const out = render({
      next: LONG_STEPS[1],
      repeats: false,
      announced: true,
    });
    expect(out).toContain("break-words");
    expect(out).toContain("min-w-0");
  });
});

describe("controles y chips", () => {
  const noop = () => {};
  test("voz es un toggle aria-pressed; pausa/reanudar con texto", () => {
    const playing = html(
      createElement(StageControls, {
        status: "playing",
        voice: true,
        onToggle: noop,
        onRestart: noop,
        onVoice: noop,
      }),
    );
    expect(playing).toContain('aria-pressed="true"');
    expect(playing).toContain(stageCopy.pause);
    expect(playing).toContain(`aria-label="${stageCopy.restart}"`);
    const paused = html(
      createElement(StageControls, {
        status: "paused",
        voice: false,
        onToggle: noop,
        onRestart: noop,
        onVoice: noop,
      }),
    );
    expect(paused).toContain('aria-pressed="false"');
    expect(paused).toContain(stageCopy.resume);
  });

  test("chips con texto e ícono decorativo", () => {
    const out = html(
      createElement(StatusChips, {
        paused: true,
        voiceOff: true,
        screenMayTurnOff: true,
      }),
    );
    expect(out).toContain(stageCopy.paused);
    expect(out).toContain(stageCopy.voiceOff);
    expect(out).toContain(stageCopy.screen);
    expect(out.split('aria-hidden="true"').length - 1).toBe(3);
  });

  test("progreso: progressbar con texto 1:42 de 4:05", () => {
    const out = html(
      createElement(ProgressBar, { positionMs: 102_000, durationMs: 245_000 }),
    );
    expect(out).toContain('role="progressbar"');
    expect(out).toContain('aria-valuetext="1:42 de 4:05"');
  });

  test("después: lista A → B con flechas decorativas", () => {
    const out = html(
      createElement(UpcomingList, {
        steps: [step("Enchufla"), step("Sombrero")],
      }),
    );
    expect(out).toContain("<ol");
    expect(out).toContain('<span aria-hidden="true">→</span>');
  });
});

describe("Stage y anuncios", () => {
  test("resumen al cambiar de paso", () => {
    const src = createFakeStageSource({
      status: "playing",
      frozen: true,
      startAtBeat: 21,
    });
    expect(stepSummary(src.getSnapshot().view)).toBe(
      "Ahora: Guapea. Siguiente: Enchufla.",
    );
    const rep = createFakeStageSource({
      status: "playing",
      frozen: true,
      startAtBeat: 13,
    });
    expect(stepSummary(rep.getSnapshot().view)).toBe(
      "Ahora: Guapea. Se repite.",
    );
  });

  test("estado en la región polite", () => {
    const paused = createFakeStageSource({
      status: "paused",
      screenMayTurnOff: true,
    });
    expect(stageAnnouncement(paused.getSnapshot())).toBe(
      `${stageCopy.paused}. ${stageCopy.screen}.`,
    );
    expect(
      stageAnnouncement(
        createFakeStageSource({ status: "blocked" }).getSnapshot(),
      ),
    ).toBe(stageCopy.blocked);
  });

  test("render completo: h1, polite, sin aria-live en la tira ni la cuenta", () => {
    const out = html(
      createElement(Stage, {
        source: createFakeStageSource({
          status: "playing",
          frozen: true,
          startAtBeat: 21,
        }),
        styleLabel: "Salsa casino",
        bpm: 184,
        onExit: () => {},
      }),
    );
    expect(out).toContain(`<h1 class="sr-only">${stageCopy.title}</h1>`);
    expect(out.split("aria-live").length - 1).toBe(1);
    expect(out).toContain('aria-current="true"');
    expect(out).toContain(`aria-label="${stageCopy.exit}"`);
    expect(out).toContain('data-variant="stage"');
  });
});
