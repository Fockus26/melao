"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { ICON_STROKE } from "@/components/ui/icon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { signInPathFor } from "@/lib/auth/redirect";
import {
  type DanceRole,
  type StyleOption,
  styleProgressLine,
} from "@/lib/course/path";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Copy provisional (CONTENT_CHECKLIST fila 54).
const COPY = {
  title: "Elige tu estilo",
  description: "Inicio y Curso muestran el estilo que elijas.",
  legend: "Estilo",
  saved: (name: string) => `Ahora ves ${name}.`,
  error: "No pudimos cambiar el estilo. Inténtalo de nuevo.",
  triggerPrefix: "Estilo: ",
} as const;

type StyleSheetProps = {
  styles: readonly StyleOption[];
  currentStyleId: string | null;
  /** Rol del perfil (D023), para "Líder · 3 de 6 lecciones". */
  role: DanceRole | null;
  /** Quién escribe `default_style_id`; en `sample` no se escribe nada. */
  userId?: string;
  mode?: "live" | "sample";
  /**
   * Disparador propio (un solo elemento que acepte `ref` y `onClick`, p. ej. el título-selector
   * de Curso). Sin él, el chip "Salsa casino ▾" de Inicio.
   */
  children?: React.ReactElement;
  /** Ruta a la que volver si la sesión venció al guardar. */
  returnTo?: string;
};

/**
 * Sheet "Elige tu estilo" (handoff § Curso): filas de 80 con el nombre en Fraunces, "Líder · n
 * de N lecciones" y un indicador radio de 28. Elegir escribe `profiles.default_style_id` (grant
 * de columna, RLS: su fila) y refresca la ruta. Radios nativos (D057): las flechas cambian la
 * elección y el Sheet sigue abierto (sin cambio de contexto, WCAG 3.2.2); con el puntero,
 * elegir además cierra. Foco atrapado, Esc cierra y el foco vuelve al disparador (Radix).
 */
export function StyleSheet({
  styles,
  currentStyleId,
  role,
  userId,
  mode = "live",
  children,
  returnTo = "/app",
}: StyleSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentStyleId);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  // Las escrituras van en fila: con las flechas pueden salir varias seguidas y gana la última.
  const queue = useRef(Promise.resolve());
  const name = useId();
  const current = styles.find((s) => s.id === selected) ?? null;

  function save(style: StyleOption) {
    if (style.id === selected) return queue.current;
    setSelected(style.id);
    setStatus(null);
    if (mode === "sample" || !userId) {
      setStatus({ ok: true, text: COPY.saved(style.name) });
      return queue.current;
    }
    queue.current = queue.current.then(async () => {
      const { error } = await createClient()
        .from("profiles")
        .update({ default_style_id: style.id })
        .eq("id", userId);
      if (error) {
        if (error.code === "PGRST301" || error.message.includes("JWT")) {
          router.replace(signInPathFor(returnTo));
          return;
        }
        // Si se cerró con el clic, se reabre para que el error se vea.
        setSelected(currentStyleId);
        setStatus({ ok: false, text: COPY.error });
        setOpen(true);
        return;
      }
      setStatus({ ok: true, text: COPY.saved(style.name) });
      router.refresh();
    });
    return queue.current;
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setStatus(null);
      }}
    >
      <SheetTrigger asChild>
        {children ?? (
          <button
            type="button"
            className={cn(
              "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-pill border border-border-input px-4 type-small font-semibold text-text",
              "transition-colors duration-hover ease-standard hover:border-text hover:bg-hover motion-reduce:transition-none",
            )}
          >
            <span className="sr-only">{COPY.triggerPrefix}</span>
            {current?.name ?? COPY.legend}
            <ChevronDown
              strokeWidth={ICON_STROKE}
              aria-hidden="true"
              className="size-4.5"
            />
          </button>
        )}
      </SheetTrigger>
      <SheetContent title={COPY.title}>
        <SheetDescription>{COPY.description}</SheetDescription>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{COPY.legend}</legend>
          {styles.map((style) => {
            const checked = style.id === selected;
            return (
              <label
                key={style.id}
                data-checked={checked || undefined}
                className={cn(
                  "flex min-h-20 cursor-pointer items-center gap-4 rounded-md border border-divider bg-surface px-4 py-3",
                  "transition-colors duration-hover ease-standard hover:border-border-input motion-reduce:transition-none",
                  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring",
                  "data-checked:border-gold-600 data-checked:bg-gold-tint",
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={style.id}
                  checked={checked}
                  onChange={() => void save(style)}
                  onClick={(event) => {
                    // `detail` > 0: clic de puntero (las flechas y Espacio dan 0). Guarda y cierra.
                    if (event.detail > 0) setOpen(false);
                  }}
                  className="sr-only"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-serif type-h3">{style.name}</span>
                  <span className="type-small text-text-secondary">
                    {styleProgressLine(style, role)}
                  </span>
                </span>
                {/* Indicador radio de 28: anillo; elegido, con punto (forma, no solo color). */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-pill border-2",
                    checked ? "border-primary" : "border-border-input",
                  )}
                >
                  {checked ? (
                    <span className="size-3.5 rounded-pill bg-primary" />
                  ) : null}
                </span>
              </label>
            );
          })}
        </fieldset>
        <p
          role={status && !status.ok ? "alert" : "status"}
          className={cn(
            "type-small",
            status?.ok === false ? "text-error" : "text-text-secondary",
          )}
        >
          {status?.text}
        </p>
      </SheetContent>
    </Sheet>
  );
}
