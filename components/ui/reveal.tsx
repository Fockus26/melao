"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Fases del mensaje (D103). `entering` dura un solo render (0fr montado, sin pintar todavía);
 * `opening` anima hacia 1fr con el contenido recortado; `open` ya no recorta (los anillos de
 * foco de un botón dentro del aviso se ven enteros); `exiting` anima hacia 0fr con el último
 * contenido y se desmonta en `transitionend`.
 */
export type RevealPhase =
  | "hidden"
  | "entering"
  | "opening"
  | "open"
  | "exiting";

export type RevealEvent =
  | { type: "show" }
  | { type: "hide"; reduced: boolean }
  | { type: "frame"; reduced: boolean }
  | { type: "transitionEnd" };

/** Máquina de estados pura (se prueba sin DOM). */
export function revealReducer(
  phase: RevealPhase,
  event: RevealEvent,
): RevealPhase {
  switch (event.type) {
    case "show":
      if (phase === "hidden") return "entering";
      // Vuelve a aparecer a mitad de la salida: invierte la transición desde donde está.
      if (phase === "exiting") return "opening";
      return phase;
    case "hide":
      if (phase === "hidden" || phase === "exiting") return phase;
      // Nunca llegó a pintarse, o sin movimiento: se va de inmediato.
      if (phase === "entering" || event.reduced) return "hidden";
      return "exiting";
    case "frame":
      if (phase !== "entering") return phase;
      return event.reduced ? "open" : "opening";
    case "transitionEnd":
      if (phase === "opening") return "open";
      if (phase === "exiting") return "hidden";
      return phase;
  }
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * El hueco (`gap`) del contenedor que el mensaje ocupa al montarse: con el mensaje cerrado se
 * anula con un margen negativo del mismo tamaño, así lo de abajo sube o baja junto con la
 * altura y no salta al final. Del lado del hermano anterior; si es el primero, del siguiente.
 */
function measureGap(el: HTMLElement) {
  const parent = el.parentElement;
  if (!parent) return;
  const style = getComputedStyle(parent);
  const column =
    style.display.includes("grid") ||
    (style.display.includes("flex") &&
      style.flexDirection.startsWith("column"));
  const gap = column ? Number.parseFloat(style.rowGap) || 0 : 0;
  const start = el.previousElementSibling ? gap : 0;
  const end = !el.previousElementSibling && el.nextElementSibling ? gap : 0;
  el.style.setProperty("--reveal-gap-start", `${start}px`);
  el.style.setProperty("--reveal-gap-end", `${end}px`);
}

/**
 * Reveal: envuelve un mensaje condicional (error bajo un campo, banner, aviso) y anima su
 * entrada y salida con la altura (`grid-template-rows` 0fr → 1fr) + opacidad, en
 * `duration-state` y `ease-standard`; lo de alrededor se desliza en vez de saltar. Con
 * `prefers-reduced-motion` el cambio es instantáneo. Si el mensaje ya está en el primer render,
 * entra abierto (sin salto de layout). Una región `aria-live` no va dentro: el Reveal vive
 * dentro de ella, o el propio mensaje es `role="alert"` y se monta al aparecer.
 */
function Reveal({
  show,
  className,
  children,
}: {
  show: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [phase, dispatch] = React.useReducer(
    revealReducer,
    show ? "open" : "hidden",
  );
  // El contenido que se desvanece al salir: el último que llegó con `show`.
  const [kept, setKept] = React.useState<React.ReactNode>(
    show ? children : null,
  );
  if (show && kept !== children) setKept(children);

  const [prevShow, setPrevShow] = React.useState(show);
  if (show !== prevShow) {
    setPrevShow(show);
    dispatch(
      show
        ? { type: "show" }
        : { type: "hide", reduced: prefersReducedMotion() },
    );
  }

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (phase === "entering" || phase === "exiting") measureGap(el);
    if (phase === "entering") {
      // Fija el estilo cerrado antes de abrir, para que el navegador tenga desde dónde animar.
      el.getBoundingClientRect();
      dispatch({ type: "frame", reduced: prefersReducedMotion() });
      return;
    }
    if (phase !== "opening" && phase !== "exiting") return;
    // Red de seguridad: sin `transitionend` (contenido de alto 0, pestaña oculta) la fase
    // igual se cierra al acabar la duración del token.
    const seconds = Number.parseFloat(getComputedStyle(el).transitionDuration);
    const timer = window.setTimeout(
      () => dispatch({ type: "transitionEnd" }),
      (seconds || 0) * 1000 + 50,
    );
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "hidden") return null;

  const closed = phase === "entering" || phase === "exiting";
  return (
    <div
      ref={ref}
      data-slot="reveal"
      data-state={closed ? "closed" : "open"}
      onTransitionEnd={(e) => {
        if (
          e.target === e.currentTarget &&
          e.propertyName === "grid-template-rows"
        )
          dispatch({ type: "transitionEnd" });
      }}
      className={cn(
        "grid transition-[grid-template-rows,opacity,margin] duration-state ease-standard motion-reduce:transition-none",
        closed
          ? "mt-[calc(var(--reveal-gap-start,0px)*-1)] mb-[calc(var(--reveal-gap-end,0px)*-1)] grid-rows-[0fr] opacity-0"
          : "grid-rows-[1fr] opacity-100",
        className,
      )}
    >
      <div className={cn("min-h-0", phase !== "open" && "overflow-hidden")}>
        {show ? children : kept}
      </div>
    </div>
  );
}

export { Reveal };
