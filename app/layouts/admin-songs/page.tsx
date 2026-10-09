import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/layout/admin-shell";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import {
  type AdminSongDetail,
  type AdminSongRow,
  type AdminSongStyle,
  difficultyChoice,
  parseAdminSongFilters,
  parseSongSelection,
  type SongIssue,
  type SongSelection,
  songWriteErrorMessage,
} from "@/lib/admin/songs";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { SongsAdminSample } from "./sample-view";

export const metadata: Metadata = {
  title: "Admin, canciones · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de Admin · Canciones sin sesión ni base (la real exige rol admin): lista + editor con
 * 10 canciones de prueba (títulos claramente de prueba, D054), por `?state=`. Guardar, publicar,
 * subir y quitar responden con puertos falsos (nada se escribe ni se sube). Los datos que en la
 * real calcula la base (preparada, licencia, dificultad, motivos) vienen escritos aquí.
 * Copy de ejemplo (CONTENT_CHECKLIST fila 87).
 */

const STATES = {
  list: "Lista",
  edit: "Canción completa",
  new: "Canción nueva",
  blocked: "Publicar bloqueado",
  "save-error": "Error al guardar",
  uploading: "Subida en curso",
  "load-error": "Error al cargar",
} as const;
type SampleState = keyof typeof STATES;

const SALSA: AdminSongStyle = {
  id: "a0000000-0000-4000-8000-000000000001",
  slug: "salsa-casino",
  name: "Salsa casino",
  published: true,
};
const MERENGUE: AdminSongStyle = {
  id: "a0000000-0000-4000-8000-000000000002",
  slug: "merengue",
  name: "Merengue",
  published: true,
};
const STYLES = [SALSA, MERENGUE];

const id = (n: number) =>
  `c0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

type SampleSong = AdminSongRow & {
  issues: SongIssue[];
  anchors: number;
  danceEndMs: number | null;
  notes: string;
};

const song = (
  n: number,
  title: string,
  styles: AdminSongStyle[],
  over: Partial<SampleSong> = {},
): SampleSong => ({
  id: id(n),
  title,
  artist: "Melao (placeholder)",
  published: true,
  styleSlugs: styles.map((s) => s.slug),
  ready: true,
  hasAudio: true,
  bpm: 180,
  durationMs: 200000,
  licenseSource: "Permiso de uso de prueba (placeholder)",
  hasLicenseDocument: true,
  licenseExpiresAt: null,
  licenseStatus: "ok",
  lessonCount: 2,
  difficultyOverride: null,
  autoDifficulty: 3,
  difficulty: 3,
  issues: [],
  anchors: 4,
  danceEndMs: 185000,
  notes: "",
  ...over,
});

const SONGS: SampleSong[] = [
  song(1, "Pista de prueba 1 · casino lento", [SALSA], {
    bpm: 160,
    autoDifficulty: 2,
    difficulty: 2,
    lessonCount: 5,
    licenseExpiresAt: "2027-06-30",
    notes:
      "Uso dentro de la app para práctica individual. Sin descarga ni uso en redes.",
  }),
  song(2, "Pista de prueba 2 · casino medio", [SALSA], {
    licenseExpiresAt: "2026-10-20",
    licenseStatus: "expiring",
  }),
  song(3, "Pista de prueba 3 · casino rápido", [SALSA], {
    bpm: 200,
    autoDifficulty: 4,
    difficulty: 5,
    difficultyOverride: 5,
    licenseExpiresAt: "2026-09-15",
    licenseStatus: "expired",
    lessonCount: 1,
  }),
  song(4, "Pista de prueba 4 · merengue medio", [MERENGUE], {
    bpm: 120,
    autoDifficulty: 2,
    difficulty: 2,
  }),
  song(5, "Pista de prueba 5 · merengue y casino", [SALSA, MERENGUE], {
    published: false,
    lessonCount: 0,
  }),
  song(6, "Pista de prueba 6 · sin preparar", [SALSA], {
    published: false,
    ready: false,
    bpm: null,
    autoDifficulty: null,
    difficulty: null,
    anchors: 0,
    danceEndMs: null,
    lessonCount: 0,
    issues: ["missing_grid", "missing_dance_end"],
  }),
  song(7, "Pista de prueba 7 · sin audio", [MERENGUE], {
    published: false,
    ready: false,
    hasAudio: false,
    durationMs: null,
    bpm: null,
    autoDifficulty: null,
    difficulty: null,
    anchors: 0,
    danceEndMs: null,
    lessonCount: 0,
    licenseSource: null,
    hasLicenseDocument: false,
    issues: [
      "missing_audio",
      "missing_grid",
      "missing_dance_end",
      "missing_license_source",
      "missing_license_document",
    ],
  }),
  song(8, "Pista de prueba 8 · sin estilo", [], {
    artist: "Conjunto de ejemplo (placeholder)",
    published: false,
    autoDifficulty: null,
    difficulty: null,
    lessonCount: 0,
    issues: ["missing_style"],
  }),
  song(9, "Pista de prueba 9 · licencia por renovar", [SALSA], {
    published: false,
    licenseExpiresAt: "2026-08-31",
    licenseStatus: "expired",
    lessonCount: 0,
    issues: ["license_expired"],
  }),
  song(
    10,
    "Pista de prueba 10 · título largo para ver cómo se corta en la lista del panel",
    [SALSA],
    {
      artist: "Orquesta de ejemplo con un nombre bastante largo (placeholder)",
      published: false,
      lessonCount: 0,
      hasLicenseDocument: false,
      issues: ["missing_license_document"],
    },
  ),
];

const ROWS: AdminSongRow[] = SONGS.map(
  ({ issues, anchors, danceEndMs, notes, ...row }) => row,
);
const SAMPLE_ISSUES = Object.fromEntries(SONGS.map((s) => [s.id, s.issues]));

function detailFor(s: SampleSong): AdminSongDetail {
  return {
    id: s.id,
    published: s.published,
    audioPath: s.hasAudio ? `${s.id}/audio-mg1x0a.mp3` : null,
    durationMs: s.durationMs,
    licenseDocumentPath: s.hasLicenseDocument
      ? `${s.id}/licencia-mg1x0b.pdf`
      : null,
    rhythm: { bpm: s.bpm, anchors: s.anchors, danceEndMs: s.danceEndMs },
    issues: s.issues,
    lessonCount: s.lessonCount,
    autoDifficulty: s.autoDifficulty,
    draft: {
      title: s.title,
      artist: s.artist,
      styleIds: STYLES.filter((st) => s.styleSlugs.includes(st.slug)).map(
        (st) => st.id,
      ),
      difficulty: difficultyChoice(s.difficultyOverride),
      licenseSource: s.licenseSource ?? "",
      licenseNotes: s.notes,
      licenseExpiresAt: s.licenseExpiresAt ?? "",
    },
  };
}

const DEFAULT_SONG: Partial<Record<SampleState, SongSelection>> = {
  edit: { kind: "song", id: id(1) },
  new: { kind: "new" },
  blocked: { kind: "song", id: id(7) },
  "save-error": { kind: "song", id: id(2) },
  uploading: { kind: "song", id: id(10) },
};

export default async function AdminSongsSamplePage(
  props: PageProps<"/layouts/admin-songs">,
) {
  const params = await props.searchParams;
  const raw = firstParam(params.state);
  const state: SampleState =
    raw && raw in STATES ? (raw as SampleState) : "list";
  const fromUrl = parseSongSelection(params);
  const selection =
    fromUrl.kind !== "none"
      ? fromUrl
      : (DEFAULT_SONG[state] ?? { kind: "none" });
  const open =
    selection.kind === "song"
      ? SONGS.find((s) => s.id === selection.id)
      : undefined;

  return (
    <AdminShell currentPath="/admin/songs">
      <div className="flex flex-col gap-12">
        <SongsAdminSample
          // Cada estado monta la vista de nuevo (la muestra no tiene router).
          key={state}
          styles={STYLES}
          songs={state === "load-error" ? [] : ROWS}
          selection={selection}
          detail={open ? detailFor(open) : null}
          initialFilters={parseAdminSongFilters(params)}
          loadError={state === "load-error"}
          basePath="/layouts/admin-songs"
          extraParams={{ state }}
          sampleIssues={SAMPLE_ISSUES}
          failSave={state === "save-error"}
          initialEditorStatus={
            state === "save-error"
              ? { tone: "error", text: songWriteErrorMessage({ message: "" }) }
              : undefined
          }
          initialUploading={state === "uploading" ? "document" : undefined}
        />
        <section
          aria-labelledby="muestra-estados"
          className="flex flex-col gap-4 rounded-md border border-divider bg-surface p-5"
        >
          <h2 id="muestra-estados" className="type-h4">
            Estados de la muestra
          </h2>
          <p className="type-small text-text-secondary">
            Nada se escribe ni se sube: guardar, publicar y los archivos
            responden con datos falsos. La vista previa del audio y del
            documento no carga (no hay Storage).
          </p>
          <ul className="flex flex-wrap gap-2">
            {(Object.keys(STATES) as SampleState[]).map((key) => (
              <li key={key}>
                <Link
                  href={`/layouts/admin-songs?state=${key}`}
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
    </AdminShell>
  );
}
