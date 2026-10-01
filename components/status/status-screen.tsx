import Link from "next/link";
import type * as React from "react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { statusCopy } from "./copy";

/**
 * Pantalla de estado común (D109): 404, error inesperado, sin conexión y mantenimiento. Página
 * entera, sin shell: logo arriba (enlace al inicio, salvo en mantenimiento), contenido centrado
 * en vertical y columna de ancho completo con el gutter de la app.
 * Orden: ilustración · filete dorado · eyebrow · título · texto · extra · acciones.
 * `split` (solo el 404): desde 1024 px, dos columnas (cuenta | texto), título display-xl y el
 * filete pasa debajo del título.
 */
type StatusScreenProps = {
  /** Destino del logo; `null` lo deja como marca sin enlace (mantenimiento: no hay adónde ir). */
  logoHref: string | null;
  illustration: React.ReactNode;
  eyebrow?: string;
  title: string;
  /** `display` (40/44) en mantenimiento; `h1` (32/38) en el resto. */
  titleSize?: "h1" | "display";
  text: string;
  /** Debajo del texto: el código del error, el aviso de sin conexión, la hora de vuelta. */
  extra?: React.ReactNode;
  actions?: React.ReactNode;
  /** Fondo: `surface` en mantenimiento, `bg` en el resto. */
  tone?: "bg" | "surface";
  split?: boolean;
};

/** Filete gold-500 de 48 × 1: decorativo (gold-500 no es texto en claro, D002). */
function Rule({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("my-7 h-px w-12 bg-gold-500", className)}
    />
  );
}

export function StatusScreen({
  logoHref,
  illustration,
  eyebrow,
  title,
  titleSize = "h1",
  text,
  extra,
  actions,
  tone = "bg",
  split = false,
}: StatusScreenProps) {
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col px-6 pt-4 pb-10 text-text lg:px-20 lg:pt-6 lg:pb-16",
        tone === "surface" ? "bg-surface" : "bg-bg",
      )}
    >
      <header className="mx-auto flex w-full max-w-300">
        {logoHref ? (
          <Link
            href={logoHref}
            aria-label={statusCopy.homeLabel}
            className="inline-flex min-h-12 items-center rounded-md"
          >
            <Logo />
          </Link>
        ) : (
          <span className="inline-flex min-h-12 items-center">
            <Logo />
          </span>
        )}
      </header>
      <main
        id="main"
        className={cn(
          "mx-auto flex w-full flex-1 flex-col justify-center",
          split
            ? "max-w-300 lg:grid lg:grid-cols-2 lg:items-center lg:gap-20"
            : "max-w-140",
        )}
      >
        <div>
          {illustration}
          <Rule className={cn(split && "lg:hidden")} />
        </div>
        <div className={cn(split && "lg:max-w-130")}>
          {eyebrow ? (
            <p className="mb-2 type-eyebrow text-gold-700 lg:mb-3">{eyebrow}</p>
          ) : null}
          <h1
            className={cn(
              "text-text",
              titleSize === "display" ? "type-display" : "type-h1",
              split && "lg:type-display-xl",
            )}
          >
            {title}
          </h1>
          {split ? <Rule className="hidden lg:block" /> : null}
          <p
            className={cn(
              "mt-4 type-body text-text-secondary",
              split && "lg:mt-0",
            )}
          >
            {text}
          </p>
          {extra}
          {actions ? (
            <div
              className={cn(
                "mt-8 flex flex-col gap-3 *:w-full",
                split && "lg:mt-9 lg:flex-row lg:*:w-auto",
              )}
            >
              {actions}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
