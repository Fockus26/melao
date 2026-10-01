import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type RadioArrowEvent,
  RadioGroup,
  RadioGroupItem,
  radioArrowStep,
} from "@/components/ui/radio-group";

/** Recorre una secuencia de eventos y devuelve en qué focos se eligió la opción. */
function run(events: RadioArrowEvent[]) {
  let armed = false;
  const selected: number[] = [];
  events.forEach((event, i) => {
    const out = radioArrowStep(armed, event);
    armed = out.armed;
    if (out.select) selected.push(i);
  });
  return { armed, selected };
}

const arrow = (key = "ArrowDown"): RadioArrowEvent => ({
  type: "keyDown",
  key,
});
const focus: RadioArrowEvent = { type: "itemFocus" };

describe("RadioGroup: la flecha mueve y elige (patrón radio de WAI-ARIA)", () => {
  test("pulsación rápida: el foco que llega tras la flecha elige", () => {
    expect(run([arrow(), focus]).selected).toEqual([1]);
  });

  test("varias flechas rápidas seguidas eligen en cada foco", () => {
    expect(
      run([arrow(), focus, arrow("ArrowUp"), focus, arrow("ArrowRight"), focus])
        .selected,
    ).toEqual([1, 3, 5]);
  });

  test("el aviso se consume: un segundo foco sin flecha no elige", () => {
    expect(run([arrow(), focus, focus]).selected).toEqual([1]);
  });

  test("Tab, Espacio u otra tecla no eligen al mover el foco", () => {
    expect(run([{ type: "keyDown", key: "Tab" }, focus]).selected).toEqual([]);
    expect(
      run([arrow(), { type: "keyDown", key: " " }, focus]).selected,
    ).toEqual([]);
  });

  test("un clic desarma (el clic ya elige por su cuenta)", () => {
    expect(run([arrow(), { type: "pointerDown" }, focus]).selected).toEqual([]);
  });

  test("si el foco sale del grupo, volver a entrar no elige", () => {
    const out = run([arrow("ArrowLeft"), { type: "focusOut" }, focus]);
    expect(out.selected).toEqual([]);
    expect(out.armed).toBe(false);
  });
});

describe("RadioGroup en el servidor", () => {
  test("rinde el radiogroup con la opción elegida marcada", () => {
    const out = renderToStaticMarkup(
      createElement(
        RadioGroup,
        { value: "lider", "aria-label": "Rol" },
        createElement(RadioGroupItem, {
          value: "lider",
          "aria-label": "Líder",
        }),
        createElement(RadioGroupItem, {
          value: "seguidor",
          "aria-label": "Seguidor",
        }),
      ),
    );
    expect(out).toContain('role="radiogroup"');
    expect(out).toContain('aria-checked="true"');
    expect(out).toContain('aria-checked="false"');
  });
});
