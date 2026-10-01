import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FormErrorBanner } from "@/components/auth/form-banner";
import { RatingButtons } from "@/components/indicators/rating-buttons";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Reveal,
  type RevealPhase,
  revealReducer,
} from "@/components/ui/reveal";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(el);

describe("Reveal: mensajes que entran y salen con la altura animada (D103)", () => {
  const run = (
    from: RevealPhase,
    ...events: Parameters<typeof revealReducer>[1][]
  ) => events.reduce(revealReducer, from);

  test("aparece: monta cerrado un render, abre animando y deja de recortar al terminar", () => {
    expect(run("hidden", { type: "show" })).toBe("entering");
    expect(run("entering", { type: "frame", reduced: false })).toBe("opening");
    expect(run("opening", { type: "transitionEnd" })).toBe("open");
  });

  test("se va: anima hasta 0fr y se desmonta en transitionend", () => {
    expect(run("open", { type: "hide", reduced: false })).toBe("exiting");
    expect(run("exiting", { type: "transitionEnd" })).toBe("hidden");
  });

  test("con prefers-reduced-motion, instantáneo en los dos sentidos", () => {
    expect(
      run("hidden", { type: "show" }, { type: "frame", reduced: true }),
    ).toBe("open");
    expect(run("open", { type: "hide", reduced: true })).toBe("hidden");
  });

  test("vuelve a mitad de la salida: invierte; se oculta antes de pintarse: se va ya", () => {
    expect(run("exiting", { type: "show" })).toBe("opening");
    expect(run("entering", { type: "hide", reduced: false })).toBe("hidden");
    expect(run("opening", { type: "hide", reduced: false })).toBe("exiting");
  });

  test("transitionEnd sobrante no cambia un estado estable", () => {
    expect(run("open", { type: "transitionEnd" })).toBe("open");
    expect(run("hidden", { type: "transitionEnd" })).toBe("hidden");
  });

  test("en el primer render: visible entra abierto (sin salto de layout); oculto no monta nada", () => {
    const open = html(createElement(Reveal, { show: true }, "Hola"));
    expect(open).toContain('data-state="open"');
    expect(open).toContain("grid-rows-[1fr]");
    expect(open).toContain("motion-reduce:transition-none");
    expect(open).toContain("duration-state");
    expect(open).not.toContain("overflow-hidden");
    expect(html(createElement(Reveal, { show: false }, "Hola"))).toBe("");
  });

  test("FormErrorBanner: sin mensaje no ocupa lugar; con mensaje, role=alert dentro del Reveal", () => {
    expect(html(createElement(FormErrorBanner, { message: null }))).toBe("");
    const out = html(createElement(FormErrorBanner, { message: "Falló" }));
    expect(out.indexOf('data-slot="reveal"')).toBeLessThan(
      out.indexOf('role="alert"'),
    );
  });
});

describe("Alert a 320 px (D104)", () => {
  test("container query: angosto con el ícono de 18 flotando, ancho con columna de 24", () => {
    const out = html(
      createElement(
        Alert,
        { variant: "warning" },
        createElement(
          AlertContent,
          null,
          createElement(AlertTitle, null, "Título"),
          createElement(AlertDescription, null, "Texto"),
        ),
      ),
    );
    expect(out).toContain("@container");
    expect(out).toContain("float-left");
    expect(out).toContain("size-4.5");
    expect(out).toContain("@xs:size-6");
    expect(out).toContain("@xs:flex");
    expect(out).toContain('role="status"');
  });
});

describe("Segmentado con indicador que se desliza", () => {
  test("antes de medir (servidor), el activo pinta su fondo y no hay indicador", () => {
    const out = html(
      createElement(
        ToggleGroup,
        {
          type: "single",
          variant: "segment",
          value: "lider",
          "aria-label": "Rol",
        },
        createElement(ToggleGroupItem, { value: "lider" }, "Líder"),
        createElement(ToggleGroupItem, { value: "seguidor" }, "Seguidor"),
      ),
    );
    expect(out).toContain('role="radiogroup"');
    expect(out).toContain('aria-checked="true"');
    expect(out).toContain("data-[state=on]:bg-primary");
    expect(out).not.toContain("toggle-group-indicator");
  });
});

describe("RatingButtons sin check (D105)", () => {
  test("el elegido se marca con relleno invertido y filete interior, sin ícono", () => {
    const out = html(
      createElement(RatingButtons, {
        name: "r",
        legend: "Enchufla",
        defaultValue: 3,
      }),
    );
    expect(out).not.toContain("<svg");
    expect(out).toContain("has-checked:bg-primary");
    expect(out).toContain("has-checked:ring-2");
    expect(out).toContain("has-checked:ring-inset");
  });
});
