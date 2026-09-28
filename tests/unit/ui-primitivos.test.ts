import { describe, expect, test } from "bun:test";
import { badgeVariants } from "@/components/ui/badge";
import { buttonVariants, iconButtonVariants } from "@/components/ui/button";
import { toggleVariants } from "@/components/ui/toggle";
import { listGroup, tokens } from "@/lib/tokens/model";
import { cn, DURATIONS, RADII, SHADOWS, TEXT_ROLES } from "@/lib/utils";

const classes = (value: string) => new Set(value.split(/\s+/));

describe("cn conoce los tokens de Melao (D046)", () => {
  test("las listas de lib/utils coinciden con design/tokens.json", () => {
    // Si falla: se agregó un token; súmalo a la lista de lib/utils.ts.
    expect<string[]>([...TEXT_ROLES]).toEqual(
      listGroup(tokens.typography).map((t) => t.name),
    );
    expect<string[]>([...RADII]).toEqual(
      listGroup(tokens.radius).map((t) => t.name),
    );
    expect<string[]>([...SHADOWS]).toEqual(
      listGroup(tokens.shadow).map((t) => t.name),
    );
    expect<string[]>(DURATIONS.map((d) => `duration-${d}`)).toEqual(
      listGroup(tokens.motion)
        .map((t) => t.name)
        .filter((n) => n.startsWith("duration-")),
    );
  });

  test("tamaño de rol y color de texto no se pisan", () => {
    expect(cn("text-small text-text")).toBe("text-small text-text");
    expect(cn("text-small text-body")).toBe("text-body");
    expect(cn("text-text text-on-primary")).toBe("text-on-primary");
  });

  test("radios, sombras, duraciones y type-<rol> se resuelven por token", () => {
    expect(cn("rounded-md rounded-pill")).toBe("rounded-pill");
    expect(cn("shadow-sheet shadow-modal")).toBe("shadow-modal");
    expect(cn("duration-hover duration-state")).toBe("duration-state");
    expect(cn("type-small type-body")).toBe("type-body");
  });
});

describe("variantes de los primitivos (handoff §2)", () => {
  test("Button: md mide 48 y lg 56, radio 12", () => {
    const md = classes(buttonVariants());
    expect(md.has("h-12")).toBe(true);
    expect(md.has("rounded-md")).toBe(true);
    expect(md.has("bg-primary")).toBe(true);
    expect(classes(buttonVariants({ size: "lg" })).has("h-14")).toBe(true);
  });

  test("Button quiet: subrayado gold-500 con 8 px a los lados", () => {
    // El componente pasa las variantes por cn: el px-2 del compuesto gana al px-5 del tamaño.
    const quiet = classes(cn(buttonVariants({ variant: "quiet" })));
    expect(quiet.has("decoration-gold-500")).toBe(true);
    expect(quiet.has("px-2")).toBe(true);
    expect(quiet.has("px-5")).toBe(false);
  });

  test("IconButton: 48 pill en los dos tamaños de ícono", () => {
    for (const iconSize of ["md", "dense"] as const) {
      const c = classes(iconButtonVariants({ iconSize }));
      expect(c.has("size-12")).toBe(true);
      expect(c.has("rounded-pill")).toBe(true);
    }
  });

  test("Chip: 40 visibles con zona táctil por pseudo-elemento; activo con gold-600", () => {
    const chip = classes(toggleVariants({ variant: "chip" }));
    expect(chip.has("h-10")).toBe(true);
    expect(chip.has("before:absolute")).toBe(true);
    expect(chip.has("data-[state=on]:border-gold-600")).toBe(true);
  });

  test("Pill: alto 24, texto 12/600, sin texto dorado", () => {
    for (const variant of ["neutral", "ok", "warning", "error"] as const) {
      const value = badgeVariants({ variant });
      expect(classes(value).has("h-6")).toBe(true);
      // D024: gold-500 nunca es texto.
      expect(value).not.toContain("text-gold-500");
    }
  });
});
