import { X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FullscreenShell } from "@/components/layout/fullscreen-shell";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { ICON_STROKE } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Escenario · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra del escenario: solo la shell con relleno. El Stage real (cuenta, fila de tiempos,
 * controles) es el paso 5 del handoff. Copy de ejemplo (CONTENT_CHECKLIST fila 39).
 */
export default function StageSample() {
  return (
    <FullscreenShell
      variant="stage"
      bar={
        <>
          {/* El escenario no usa el Button de la app (handoff §2 Stage). */}
          <Link
            href="/layouts"
            aria-label="Salir de la muestra"
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-pill border border-stage-control-border text-stage-current hover:bg-stage-panel"
          >
            <X
              aria-hidden="true"
              strokeWidth={ICON_STROKE}
              className="size-6"
            />
          </Link>
          <p className="type-small text-stage-secondary">
            Salsa casino · 184 BPM
          </p>
        </>
      }
    >
      <h1 className="sr-only">Sesión de práctica</h1>
      <div className="flex items-end justify-between gap-3 border-b border-stage-track pt-6 pb-3">
        <div className="flex flex-col gap-1">
          <p className="type-stage-label text-stage-label uppercase">Ahora</p>
          <p className="type-stage-current">Guapea</p>
        </div>
        <p className="type-small tabular-nums text-stage-secondary">
          frase 2 de 2
        </p>
      </div>
      <p
        aria-hidden="true"
        className="flex flex-1 items-center justify-center type-stage-count text-stage-count"
      >
        5
      </p>
      <div className="flex flex-col gap-4">
        <p className="type-stage-next text-stage-next">
          <span className="sr-only">Siguiente: </span>Enchufla
        </p>
        <p className="type-small text-stage-secondary">
          El escenario es negro en tema claro y oscuro. Cambia el tema para
          comprobarlo:
        </p>
        <ThemeSwitch />
      </div>
    </FullscreenShell>
  );
}
