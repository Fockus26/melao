import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PracticeSkeleton } from "@/components/practice/practice-skeleton";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { PracticeSample, type PracticeSampleState } from "./practice-sample";

export const metadata: Metadata = {
  title: "Practicar · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de Practicar (`/app/practice`) sin sesión ni base: los estados por `?state=`, con
 * canciones de prueba y un `plan-session` falso (Empezar no abre la sesión).
 * Copy de ejemplo (CONTENT_CHECKLIST fila 64).
 */

const STATES = {
  ready: "Lista para empezar",
  "no-subscription": "Sin suscripción",
  "no-steps": "Sin pasos",
  "not-ready": "Canción no lista",
  offline: "Sin conexión",
  loading: "Cargando",
  "no-styles": "Sin estilos",
} as const;
type SampleState = keyof typeof STATES;

export default async function PracticeSamplePage(
  props: PageProps<"/layouts/practice">,
) {
  const params = await props.searchParams;
  const raw = firstParam(params.state);
  const state: SampleState =
    raw && raw in STATES ? (raw as SampleState) : "ready";

  return (
    <AppShell
      currentPath="/app/practice"
      plan={{ name: "Básico", status: "activo" }}
    >
      <div className="flex flex-col gap-12">
        {state === "loading" ? (
          <PracticeSkeleton />
        ) : (
          <PracticeSample key={state} state={state as PracticeSampleState} />
        )}
        <section
          aria-labelledby="muestra-estados"
          className="flex flex-col gap-4 rounded-md border border-divider bg-surface p-5"
        >
          <h2 id="muestra-estados" className="type-h4">
            Estados de la muestra
          </h2>
          <ul className="flex flex-wrap gap-2">
            {(Object.keys(STATES) as SampleState[]).map((key) => (
              <li key={key}>
                <Link
                  href={`/layouts/practice?state=${key}`}
                  aria-current={key === state ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-12 items-center rounded-pill border px-4 type-small",
                    key === state
                      ? "border-primary bg-primary font-semibold text-on-primary"
                      : "border-border-input text-text hover:bg-hover",
                  )}
                >
                  {STATES[key]}
                </Link>
              </li>
            ))}
          </ul>
          <ThemeSwitch />
          <Link
            href="/layouts"
            className="inline-flex min-h-12 items-center self-start type-small text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text"
          >
            Volver a las muestras
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
