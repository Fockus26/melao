import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { StepDetailSkeleton } from "@/components/steps/detail/step-detail-skeleton";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { firstParam } from "@/lib/search-params";
import type { StepDetail } from "@/lib/steps/detail";
import { cn } from "@/lib/utils";
import { StepDetailSample } from "./sample-view";

export const metadata: Metadata = {
  title: "Paso, detalle · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de Pasos · detalle sin sesión ni base (la real exige cuenta): los estados por
 * `?state=`, con pasos de salsa casino del seed. El segmentado, los chips de estado y el corazón
 * funcionan, pero nada se escribe ("error" y "sin rol" simulan la respuesta de `review-steps`).
 * "Ahora" fijo: 2 de octubre de 2026 a mediodía UTC. Copy de ejemplo (CONTENT_CHECKLIST fila 79).
 */

const STATES = {
  history: "Con historial",
  video: "Con video",
  free: "Paso libre",
  empty: "Sin historial ni relacionados",
  "no-plan": "Sin suscripción",
  "no-role": "Perfil sin rol",
  error: "Error al guardar",
  long: "Nombre largo",
  loading: "Cargando",
} as const;
type SampleState = keyof typeof STATES;

const NOW = "2026-10-02T12:00:00Z";
const daysAgo = (days: number, hour = 19) =>
  new Date(
    Date.parse(NOW) - days * 86_400_000 + (hour - 12) * 3_600_000,
  ).toISOString();
const inDays = (days: number) =>
  new Date(Date.parse(NOW) + days * 86_400_000).toISOString();

const STYLE = "salsa-casino";

/** Enchufla del seed: aprendiendo, con repasos y su variación. */
const ENCHUFLA: StepDetail = {
  id: "enchufla",
  styleId: STYLE,
  slug: "enchufla",
  name: "Enchufla",
  description:
    "Desde cerrada, los dos cambian de lugar con una vuelta de la pareja y quedan en guapea.",
  category: "salida",
  difficulty: 2,
  phrases: 1,
  beatNotes: [
    { beat: 1, note: "Rompe atrás" },
    { beat: 5, note: "Cambio de lugar" },
  ],
  free: false,
  startPosition: "Cerrada",
  endPosition: "Guapea",
  videos: [],
  role: "leader",
  status: "learning",
  favorite: true,
  dueAt: inDays(3),
  related: [
    {
      id: "dile-que-si",
      slug: "dile-que-si",
      name: "Dile que sí",
      relation: "prerequisite",
    },
    {
      id: "enchufla-doble",
      slug: "enchufla-doble",
      name: "Enchufla doble",
      relation: "variation",
    },
    {
      id: "enchufla-con-mambo",
      slug: "enchufla-con-mambo",
      name: "Enchufla con mambo",
      relation: "variation",
    },
  ],
  history: [
    { reviewedAt: daysAgo(1), rating: 3, context: "practice", role: "leader" },
    { reviewedAt: daysAgo(4), rating: 2, context: "practice", role: "leader" },
    { reviewedAt: daysAgo(9), rating: 1, context: "lesson", role: "leader" },
    {
      reviewedAt: daysAgo(12),
      rating: 3,
      context: "catalog",
      role: "follower",
    },
    { reviewedAt: daysAgo(380), rating: 4, context: "lesson", role: "leader" },
  ],
};

function stepFor(state: SampleState): StepDetail {
  switch (state) {
    case "video":
      return {
        ...ENCHUFLA,
        videos: [
          { role: "leader", durationMs: 42_000 },
          { role: "follower", durationMs: 39_000 },
        ],
      };
    case "free":
      return {
        ...ENCHUFLA,
        id: "despelote",
        slug: "despelote",
        name: "Despelote",
        description:
          "Movimiento suelto de hombros y cadera, sin pareja, para los cortes de la canción.",
        category: "libre",
        difficulty: 1,
        phrases: 1,
        beatNotes: [
          { beat: 1, note: "Suelta los hombros" },
          { beat: 3, note: "Lleva la cadera al lado" },
          { beat: 5, note: "Vuelve al centro" },
        ],
        free: true,
        startPosition: "Separados",
        endPosition: "Separados",
        videos: [{ role: "both", durationMs: 28_000 }],
        status: "known",
        favorite: false,
        dueAt: inDays(21),
        related: [],
        history: [
          {
            reviewedAt: daysAgo(2),
            rating: 4,
            context: "catalog",
            role: "leader",
          },
        ],
      };
    case "empty":
      return {
        ...ENCHUFLA,
        id: "sombrero",
        slug: "sombrero",
        name: "Sombrero",
        description: null,
        category: "figura",
        difficulty: 3,
        phrases: 2,
        beatNotes: [],
        startPosition: "Guapea",
        endPosition: "Guapea",
        status: "unknown",
        favorite: false,
        dueAt: null,
        related: [],
        history: [],
      };
    case "no-role":
      return { ...ENCHUFLA, role: null, status: "unknown", dueAt: null };
    case "long":
      return {
        ...ENCHUFLA,
        name: "Dile que no con vuelta de la dama",
        startPosition: "Cerrada con las manos cruzadas",
        endPosition: "Abierta de frente",
      };
    default:
      return ENCHUFLA;
  }
}

export default async function StepDetailSamplePage(
  props: PageProps<"/layouts/step-detail">,
) {
  const params = await props.searchParams;
  const raw = firstParam(params.state);
  const state: SampleState =
    raw && raw in STATES ? (raw as SampleState) : "history";

  return (
    <AppShell
      currentPath="/app/steps/enchufla"
      plan={
        state === "no-plan" ? undefined : { name: "Básico", status: "activo" }
      }
    >
      <div className="flex flex-col gap-12">
        {state === "loading" ? (
          <StepDetailSkeleton />
        ) : (
          <StepDetailSample
            key={state}
            step={stepFor(state)}
            currentStyleId={STYLE}
            canChangeStatus={state !== "no-plan"}
            now={NOW}
            failWith={
              state === "error"
                ? "error"
                : state === "no-role"
                  ? "role"
                  : undefined
            }
          />
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
                  href={`/layouts/step-detail?state=${key}`}
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
