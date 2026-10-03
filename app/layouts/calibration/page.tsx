import type { Metadata } from "next";
import Link from "next/link";
import {
  CalibrationFlow,
  type CalibrationPhase,
} from "@/components/calibration/calibration-flow";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import {
  evaluateCalibration,
  type SavedLatency,
} from "@/lib/calibration/calibration";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Calibrar audífonos · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de Calibrar audífonos (`/app/profile/calibration`) sin sesión ni base: los 6 estados
 * por `?state=`. Suena de verdad (Empezar, Repetir, Probar con la cuenta) pero guardar no
 * escribe nada. Datos de ejemplo (CONTENT_CHECKLIST fila 39).
 */

const STATES = {
  before: "1 · Antes de empezar",
  listen: "2 · Escucha y toca",
  result: "3 · Resultado",
  fine: "4 · Ajuste fino",
  irregular: "5 · Toques irregulares",
  speaker: "6 · Sin audífonos",
  "speaker-empty": "Sin audífonos, sin ajustes",
  "out-of-range": "Fuera de rango",
  incomplete: "Faltaron toques",
} as const;
type SampleState = keyof typeof STATES;

const PRACTICE = [210, 150, 190, 175];
/** Toques de ejemplo: +180 ms con desvío de 6. */
const STEADY = evaluateCalibration([
  ...PRACTICE,
  170,
  185,
  180,
  175,
  190,
  182,
  178,
  180,
]);
const IRREGULAR = evaluateCalibration([
  ...PRACTICE,
  100,
  200,
  150,
  250,
  120,
  180,
  90,
  230,
]);

const SAVED: SavedLatency[] = [
  {
    deviceKey: "bluetooth:android",
    label: "Audífonos Bluetooth · Android",
    offsetMs: 180,
    measuredAt: "2026-09-28T21:30:00.000Z",
  },
  {
    deviceKey: "speaker:windows",
    label: "Altavoz o audífonos con cable · Windows",
    offsetMs: 40,
    measuredAt: "2026-09-12T15:00:00.000Z",
  },
];

function phaseFor(state: SampleState): CalibrationPhase {
  switch (state) {
    case "listen":
      return { kind: "listen", taps: 5 };
    case "result":
      return { kind: "result", result: { ...STEADY, offsetMs: 180 } };
    case "fine":
      return { kind: "fine", value: 190, result: STEADY };
    case "irregular":
      return { kind: "irregular", result: IRREGULAR };
    case "out-of-range":
      return {
        kind: "irregular",
        result: evaluateCalibration([...PRACTICE, ...Array(8).fill(780)]),
      };
    case "incomplete":
      return {
        kind: "irregular",
        result: evaluateCalibration([...PRACTICE, 180, 175, 190, 185, 180]),
      };
    case "speaker":
    case "speaker-empty":
      return { kind: "speaker" };
    default:
      return { kind: "before" };
  }
}

export default async function CalibrationSample(
  props: PageProps<"/layouts/calibration">,
) {
  const params = await props.searchParams;
  const raw = firstParam(params.state);
  const state: SampleState =
    raw && raw in STATES ? (raw as SampleState) : "before";

  return (
    <>
      <CalibrationFlow
        key={state}
        saved={state === "speaker-empty" ? [] : SAVED}
        closeHref="/layouts"
        mode="sample"
        initialPhase={phaseFor(state)}
      />
      <nav
        aria-labelledby="estados-titulo"
        className="flex flex-col gap-6 bg-bg px-5 py-8 text-text"
      >
        <div className="mx-auto flex w-full max-w-160 flex-col gap-6">
          <h2 id="estados-titulo" className="type-h2">
            Estados de Calibrar
          </h2>
          <p className="type-small text-text-secondary">
            Sin sesión: los clics suenan y los toques se miden de verdad, pero
            guardar no escribe nada. En «Escucha y toca», «Empezar de nuevo»
            arranca una medición real.
          </p>
          <ul className="flex flex-col gap-1">
            {(Object.keys(STATES) as SampleState[]).map((id) => (
              <li key={id}>
                <Link
                  href={`/layouts/calibration?state=${id}`}
                  aria-current={id === state ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center rounded-md px-3 type-body text-text hover:bg-hover",
                    id === state &&
                      "bg-gold-tint font-semibold underline decoration-gold-500 underline-offset-5",
                  )}
                >
                  {STATES[id]}
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
