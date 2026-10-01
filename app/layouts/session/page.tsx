import type { Metadata } from "next";
import Link from "next/link";
import { PracticeSession } from "@/components/stage/practice-session";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { SAMPLE_SESSION } from "./sample-data";

export const metadata: Metadata = {
  title: "Sesión · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de la sesión de práctica (`/app/practice/session`) sin cuenta ni base: el reproductor
 * real (reloj de Web Audio, D030) con la pista sintética (D121) y una sesión de ejemplo. Suena:
 * es la forma de oír el coach sin sesión. Salir y Terminar vuelven a las muestras.
 * Copy de ejemplo (CONTENT_CHECKLIST fila 68).
 */
export default function SessionSamplePage() {
  return (
    <>
      <PracticeSession
        data={SAMPLE_SESSION}
        exitHref="/layouts"
        resultHref="/layouts"
      />
      <section
        aria-labelledby="muestra-sesion-titulo"
        className="flex flex-col gap-6 bg-bg px-5 py-8 text-text"
      >
        <div className="mx-auto flex w-full max-w-160 flex-col gap-6">
          <h2 id="muestra-sesion-titulo" className="type-h2">
            Sobre esta muestra
          </h2>
          <p className="type-body text-text-secondary">
            Suena de verdad: campana en cada tiempo y bombo en el 1 y en el 5
            (pista de prueba mientras llegan las canciones), con un tono por
            número en la cuenta y dos tonos al anunciar el paso siguiente. Salsa
            casino a 184 BPM, unos 45 segundos.
          </p>
          <ThemeSwitch />
          <Link
            href="/layouts"
            className="inline-flex min-h-12 items-center self-start type-small text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text"
          >
            Volver a las muestras
          </Link>
        </div>
      </section>
    </>
  );
}
