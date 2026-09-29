import type { Metadata } from "next";
import Link from "next/link";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { cn } from "@/lib/utils";
import { DEMO_STATES, type DemoStateId, isDemoState } from "./demo-states";
import { StageDemo } from "./stage-demo";

/**
 * Muestra del escenario (handoff §7 paso 5) con el motor FALSO: el Stage completo arriba y,
 * debajo del pliegue, el selector de estado (`?estado=`). Interna: sin enlace desde la app y
 * fuera de buscadores. Apaisado se ve girando el teléfono (media query, D068), no con un botón.
 */
export const metadata: Metadata = {
  title: "Escenario · Melao",
  robots: { index: false, follow: false },
};

export default async function EscenarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { estado } = await searchParams;
  const state: DemoStateId = isDemoState(estado) ? estado : "reproduciendo";
  return (
    <>
      <StageDemo key={state} state={state} />
      <nav
        aria-labelledby="estados-titulo"
        className="flex flex-col gap-6 bg-bg px-5 py-8 text-text"
      >
        <div className="mx-auto flex w-full max-w-160 flex-col gap-6">
          <h2 id="estados-titulo" className="type-h2">
            Estados del escenario
          </h2>
          <p className="type-small text-text-secondary">
            Motor falso: sin audio, el tiempo avanza con la pantalla. Las
            instantáneas arrancan detenidas en un momento concreto; cualquier
            control las pone en marcha.
          </p>
          <ul className="flex flex-col gap-1">
            {(Object.keys(DEMO_STATES) as DemoStateId[]).map((id) => (
              <li key={id}>
                <Link
                  href={`/escenario?estado=${id}`}
                  aria-current={id === state ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center rounded-md px-3 type-body text-text hover:bg-hover",
                    id === state &&
                      "bg-gold-tint font-semibold underline decoration-gold-500 underline-offset-5",
                  )}
                >
                  {DEMO_STATES[id].label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="type-small text-text-secondary">
            El escenario es negro en claro y en oscuro. Cambia el tema para
            comprobarlo:
          </p>
          <ThemeSwitch />
        </div>
      </nav>
    </>
  );
}
