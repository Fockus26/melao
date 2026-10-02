import type { Metadata } from "next";
import Link from "next/link";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { ResultSample } from "./result-sample";
import { SAMPLE_STATES, type SampleState } from "./sample-states";

export const metadata: Metadata = {
  title: "Resultado · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra del resultado de la práctica (`/app/practice/result`) sin sesión ni base: cada estado
 * por `?state=`, con un review-steps falso. Bajo el pliegue, el selector de estado y el tema.
 * Copy de ejemplo (CONTENT_CHECKLIST fila 69).
 */
export default async function PracticeResultSamplePage(
  props: PageProps<"/layouts/practice-result">,
) {
  const raw = firstParam((await props.searchParams).state);
  const state: SampleState =
    raw && raw in SAMPLE_STATES ? (raw as SampleState) : "rating";

  return (
    <>
      <ResultSample key={state} state={state} />
      <nav
        aria-labelledby="estados-titulo"
        className="flex flex-col gap-6 bg-bg px-5 py-8 text-text"
      >
        <div className="mx-auto flex w-full max-w-160 flex-col gap-6">
          <h2 id="estados-titulo" className="type-h2">
            Estados del resultado
          </h2>
          <p className="type-small text-text-secondary">
            Backend falso: guardar tarda un momento y devuelve fechas de
            ejemplo; nada se escribe.
          </p>
          <ul className="flex flex-col gap-1">
            {(Object.keys(SAMPLE_STATES) as SampleState[]).map((id) => (
              <li key={id}>
                <Link
                  href={`/layouts/practice-result?state=${id}`}
                  aria-current={id === state ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center rounded-md px-3 type-body text-text hover:bg-hover",
                    id === state &&
                      "bg-gold-tint font-semibold underline decoration-gold-500 underline-offset-5",
                  )}
                >
                  {SAMPLE_STATES[id]}
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
        </div>
      </nav>
    </>
  );
}
