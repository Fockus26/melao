import { X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FullscreenShell } from "@/components/layout/fullscreen-shell";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { Button, IconButton } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Pantalla completa · Layouts · Melao",
  robots: { index: false, follow: false },
};

/** Muestra de la lección a pantalla completa. Copy de ejemplo (CONTENT_CHECKLIST fila 39). */
export default function FullscreenSample() {
  return (
    <FullscreenShell
      bar={
        <>
          {/* En la lección real la X pide confirmación; aquí vuelve al índice. */}
          <IconButton asChild aria-label="Salir de la muestra">
            <Link href="/layouts">
              <X aria-hidden="true" strokeWidth={ICON_STROKE} />
            </Link>
          </IconButton>
          {/* Lugar del LessonProgress (indicadores, W3). */}
          <div
            aria-hidden="true"
            className="h-1 flex-1 rounded-pill bg-surface-sunken"
          />
          <p className="type-small tabular-nums text-text-secondary">
            <span className="sr-only">Etapa </span>1 / 6
          </p>
        </>
      }
    >
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="type-eyebrow text-text-secondary">Lección 3</p>
          <h1 className="type-display">Enchufla y dile que no</h1>
          <p className="type-body text-text-secondary">
            2 pasos nuevos · unos 8 minutos
          </p>
        </header>
        <ol className="flex flex-col gap-3">
          <li className="rounded-md border border-divider bg-surface p-5 type-body">
            1. Enchufla
          </li>
          <li className="rounded-md border border-divider bg-surface p-5 type-body">
            2. Dile que no
          </li>
        </ol>
        <p className="type-body">
          Primero ves cada paso por tiempos, después lo practicas con la cuenta
          y al final lo bailas entero sobre una canción.
        </p>
        <ThemeSwitch />
        <Button size="lg" className="w-full md:max-w-80">
          Empezar
        </Button>
      </div>
    </FullscreenShell>
  );
}
