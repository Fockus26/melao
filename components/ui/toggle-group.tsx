"use client";

import type { VariantProps } from "class-variance-authority";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import * as React from "react";
import { ToggleCheck, toggleVariants } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

type ToggleVariant = VariantProps<typeof toggleVariants>["variant"];

const ToggleGroupContext = React.createContext<{
  variant: ToggleVariant;
  /** El indicador ya está medido: el segmento activo deja de pintar su propio fondo. */
  indicator: boolean;
}>({ variant: "chip", indicator: false });

type IndicatorBox = { x: number; width: number; animate: boolean };

/**
 * Posición del indicador del segmentado: un solo elemento que sigue al segmento activo
 * (`data-state="on"`, lo pone Radix) con `translateX` y su ancho medido. Recalcula al cambiar
 * la selección (controlada o no) y al cambiar de tamaño. La primera medición no anima.
 */
function useSegmentIndicator(
  ref: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const [box, setBox] = React.useState<IndicatorBox | null>(null);

  React.useLayoutEffect(() => {
    const root = ref.current;
    if (!enabled || !root) return;
    let measured = false;
    const measure = () => {
      const active = root.querySelector<HTMLElement>(
        '[data-slot="toggle-group-item"][data-state="on"]',
      );
      if (!active) {
        setBox(null);
        return;
      }
      setBox({
        x: active.offsetLeft,
        width: active.offsetWidth,
        animate: measured,
      });
      measured = true;
    };
    measure();
    const mutations = new MutationObserver(measure);
    mutations.observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    return () => {
      mutations.disconnect();
      resize.disconnect();
    };
  }, [ref, enabled]);

  return box;
}

/**
 * Grupo de chips o SegmentedControl (handoff §2).
 * - `type="multiple"` → filtros: `role="toolbar"` + `aria-pressed` en cada chip.
 * - `type="single"` → elección única: `role="radiogroup"` + `role="radio"` + `aria-checked`.
 * Las filas de chips hacen `flex-wrap`, nunca scroll horizontal. El segmentado es un contenedor
 * pill con borde y padding 4; el fondo del activo es un indicador que se desliza (`translateX`,
 * `duration-move` 240 ms, `ease-standard`; handoff §6) y el color del texto cambia en 200 ms.
 * Con `prefers-reduced-motion`, salta. Hasta medirlo (primer render en el servidor), el fondo lo
 * pinta el propio segmento activo.
 */
function ToggleGroup({
  className,
  variant = "chip",
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  variant?: ToggleVariant;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const segment = variant === "segment";
  const box = useSegmentIndicator(ref, segment);
  const context = React.useMemo(
    () => ({ variant, indicator: segment && box !== null }),
    [variant, segment, box],
  );
  return (
    <ToggleGroupPrimitive.Root
      ref={ref}
      data-slot="toggle-group"
      data-variant={variant}
      className={cn(
        segment
          ? "relative flex w-full gap-1 rounded-pill border border-border-input p-1"
          : "flex flex-wrap gap-2",
        className,
      )}
      {...props}
    >
      {segment && box ? (
        <span
          aria-hidden="true"
          data-slot="toggle-group-indicator"
          className={cn(
            "pointer-events-none absolute inset-y-1 left-0 rounded-pill bg-primary",
            box.animate &&
              "transition-[transform,width] duration-move ease-standard motion-reduce:transition-none",
          )}
          style={{ width: box.width, transform: `translateX(${box.x}px)` }}
        />
      ) : null}
      <ToggleGroupContext.Provider value={context}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  const { variant, indicator } = React.useContext(ToggleGroupContext);
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        toggleVariants({ variant }),
        indicator &&
          "data-[state=on]:bg-transparent data-[state=on]:hover:bg-transparent",
        className,
      )}
      {...props}
    >
      <ToggleCheck />
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
