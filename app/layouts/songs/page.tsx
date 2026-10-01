import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SongsSkeleton } from "@/components/songs/songs-skeleton";
import { SongsView, type SongsViewProps } from "@/components/songs/songs-view";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import type { StyleOption } from "@/lib/course/path";
import { firstParam } from "@/lib/search-params";
import type { PracticeSong } from "@/lib/songs/songs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Canciones · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de Practicar · canciones sin sesión ni base (la real exige cuenta): los estados por
 * `?state=`, con canciones de ejemplo como las del seed. Búsqueda, filtros y corazón funcionan,
 * pero el corazón no escribe nada. Copy de ejemplo (CONTENT_CHECKLIST fila 66).
 */

const STATES = {
  list: "Lista",
  filtered: "Con filtros",
  favorites: "Favoritas",
  "no-favorites": "Sin favoritas",
  "no-results": "Sin resultados",
  empty: "Estilo sin canciones",
  "one-style": "Un solo estilo",
  "no-styles": "Sin estilos",
  loading: "Cargando",
  error: "Error",
} as const;
type SampleState = keyof typeof STATES;

const PLACEHOLDER = "Melao (placeholder)";

const SONGS: PracticeSong[] = [
  {
    id: "c1",
    title: "Pista de prueba 1 · casino lento",
    artist: PLACEHOLDER,
    bpm: 160,
    durationMs: 210_000,
    difficulty: 2,
    favorite: true,
    ready: true,
  },
  {
    id: "c2",
    title: "Pista de prueba 2 · casino medio",
    artist: PLACEHOLDER,
    bpm: 180,
    durationMs: 200_000,
    difficulty: 3,
    favorite: false,
    ready: true,
  },
  {
    id: "c3",
    title: "Pista de prueba 3 · casino rápido",
    artist: PLACEHOLDER,
    bpm: 200,
    durationMs: 195_000,
    difficulty: 4,
    favorite: false,
    ready: true,
  },
  {
    id: "c6",
    title:
      "Pista de prueba 6 · casino con un título largo que no cabe en una sola línea del teléfono",
    artist:
      "Orquesta de ejemplo con un nombre también bastante largo para una línea",
    bpm: 184,
    durationMs: 245_000,
    difficulty: 3,
    favorite: true,
    ready: true,
  },
  {
    id: "c7",
    title: "Pista de prueba 7 · sin preparar",
    artist: PLACEHOLDER,
    bpm: null,
    durationMs: 180_000,
    difficulty: null,
    favorite: false,
    ready: false,
  },
];

const STYLE = (id: string, name: string): StyleOption => ({
  id,
  name,
  hasRoles: true,
  chosen: true,
  hasCourse: true,
  lessonCount: 6,
  completedCount: 2,
});
const STYLES = [
  STYLE("salsa-casino", "Salsa casino"),
  STYLE("merengue", "Merengue"),
];

function propsFor(state: SampleState): SongsViewProps {
  const base: SongsViewProps = {
    styles: STYLES,
    currentStyle: STYLES[0],
    songs: SONGS,
    variant: "sample",
    basePath: "/layouts/songs",
  };
  switch (state) {
    case "filtered":
      return {
        ...base,
        initialFilters: { q: "rapido", difficulty: [3, 4], favorites: false },
      };
    case "favorites":
      return {
        ...base,
        initialFilters: { q: "", difficulty: [], favorites: true },
      };
    case "no-favorites":
      return {
        ...base,
        songs: SONGS.map((s) => ({ ...s, favorite: false })),
        initialFilters: { q: "", difficulty: [], favorites: true },
      };
    case "no-results":
      return {
        ...base,
        initialFilters: { q: "bachata", difficulty: [], favorites: false },
      };
    case "empty":
      return { ...base, currentStyle: STYLES[1], songs: [] };
    case "one-style":
      return { ...base, styles: STYLES.slice(0, 1) };
    case "no-styles":
      return { ...base, styles: [], currentStyle: null, songs: [] };
    case "error":
      return { ...base, songs: [], loadError: true };
    default:
      return base;
  }
}

export default async function SongsSample(props: PageProps<"/layouts/songs">) {
  const params = await props.searchParams;
  const raw = firstParam(params.state);
  const state: SampleState =
    raw && raw in STATES ? (raw as SampleState) : "list";

  return (
    <AppShell
      currentPath="/app/practice"
      plan={{ name: "Básico", status: "activo" }}
    >
      <div className="flex flex-col gap-12">
        {state === "loading" ? (
          <SongsSkeleton />
        ) : (
          <SongsView key={state} {...propsFor(state)} />
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
                  href={`/layouts/songs?state=${key}`}
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
