import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/layout/admin-shell";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import {
  type AdminPosition,
  type AdminStepDetail,
  type AdminStepRow,
  type AdminStyle,
  beatNotesToDraft,
  parseAdminStepFilters,
  parseSelection,
  type StepSelection,
  type StepVideo,
  writeErrorMessage,
} from "@/lib/admin/steps";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { StepsAdminSample } from "./sample-view";

export const metadata: Metadata = {
  title: "Admin, pasos · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de Admin · Pasos sin sesión ni base (la real exige rol admin): lista + editor con 12
 * pasos de salsa casino como los del seed, por `?state=`. Guardar, publicar, subir y quitar
 * responden con puertos falsos (nada se escribe ni se sube). Merengue sale vacío a propósito.
 * Copy de ejemplo (CONTENT_CHECKLIST fila 83).
 */

const STATES = {
  list: "Lista",
  edit: "Paso completo",
  new: "Paso nuevo",
  blocked: "Publicar bloqueado",
  "save-error": "Error al guardar",
  uploading: "Subida en curso",
  "load-error": "Error al cargar",
} as const;
type SampleState = keyof typeof STATES;

const SALSA: AdminStyle = {
  id: "a0000000-0000-4000-8000-000000000001",
  slug: "salsa-casino",
  name: "Salsa casino",
  hasRoles: true,
  beatsPerPhrase: 8,
  published: true,
};
const MERENGUE: AdminStyle = {
  id: "a0000000-0000-4000-8000-000000000002",
  slug: "merengue",
  name: "Merengue",
  hasRoles: true,
  beatsPerPhrase: 8,
  published: false,
};

const POSITIONS: AdminPosition[] = [
  { id: "a1000000-0000-4000-8000-000000000003", name: "Abierta" },
  { id: "a1000000-0000-4000-8000-000000000002", name: "Cerrada" },
  { id: "a1000000-0000-4000-8000-000000000001", name: "Guapea" },
];
const [ABIERTA, CERRADA, GUAPEA] = POSITIONS.map((p) => p.id);

const id = (n: number) =>
  `b1000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

type SampleStep = AdminStepRow & {
  start: string;
  end: string;
  description: string;
  notes?: { beat: number; note: string }[];
  roles: StepVideo["role"][];
};

const step = (
  n: number,
  slug: string,
  name: string,
  category: AdminStepRow["category"],
  difficulty: number,
  start: string,
  end: string,
  over: Partial<SampleStep> = {},
): SampleStep => ({
  id: id(n),
  slug,
  name,
  category,
  difficulty,
  published: true,
  sortOrder: n * 10,
  videosComplete: true,
  hasVoiceClip: true,
  lessonCount: 1,
  start,
  end,
  description: "",
  roles: ["leader", "follower"],
  ...over,
});

const STEPS: SampleStep[] = [
  step(1, "guapea", "Guapea", "base", 1, GUAPEA, GUAPEA, {
    description:
      "Paso base en posición abierta: los dos marcan atrás y adelante frente a frente.",
    notes: [
      { beat: 1, note: "Atrás con el pie izquierdo" },
      { beat: 5, note: "Adelante, de vuelta al centro" },
    ],
    lessonCount: 3,
  }),
  step(2, "basico-cerrada", "Básico en cerrada", "base", 1, CERRADA, CERRADA),
  step(3, "dile-que-si", "Dile que sí", "entrada", 1, GUAPEA, CERRADA),
  step(4, "dile-que-no", "Dile que no", "salida", 1, CERRADA, GUAPEA),
  step(
    5,
    "vuelta-derecha",
    "Vuelta a la derecha",
    "vuelta",
    1,
    GUAPEA,
    GUAPEA,
    {
      videosComplete: false,
      roles: ["leader"],
      hasVoiceClip: false,
    },
  ),
  step(7, "enchufla", "Enchufla", "salida", 2, CERRADA, GUAPEA, {
    description:
      "Desde cerrada, los dos cambian de lugar con una vuelta de la pareja y quedan en guapea.",
    notes: [
      { beat: 1, note: "Rompe atrás" },
      { beat: 3, note: "Levanta la mano izquierda" },
      { beat: 5, note: "Cambio de lugar" },
    ],
    lessonCount: 2,
  }),
  step(8, "enchufla-doble", "Enchufla doble", "variacion", 3, CERRADA, GUAPEA, {
    lessonCount: 0,
  }),
  step(9, "exhibela", "Exhíbela", "figura", 2, GUAPEA, GUAPEA, {
    published: false,
    lessonCount: 0,
    hasVoiceClip: false,
  }),
  step(13, "sombrero", "Sombrero", "figura", 3, CERRADA, CERRADA, {
    published: false,
    videosComplete: false,
    roles: ["leader"],
    lessonCount: 0,
    description:
      "El líder pasa las manos cruzadas por encima de la cabeza de la pareja y las deja sobre sus hombros.",
  }),
  step(14, "setenta", "Setenta", "figura", 3, CERRADA, GUAPEA, {
    published: false,
    videosComplete: false,
    roles: [],
    hasVoiceClip: false,
    lessonCount: 0,
  }),
  step(18, "abanico", "Abanico", "figura", 2, CERRADA, ABIERTA, {
    published: false,
    lessonCount: 0,
  }),
  step(21, "rumba-libre", "Rumba libre", "libre", 1, ABIERTA, ABIERTA, {
    roles: ["both"],
    lessonCount: 0,
  }),
];

const ROWS: AdminStepRow[] = STEPS.map(
  ({ start, end, description, notes, roles, ...row }) => row,
);

const videosOf = (s: SampleStep): StepVideo[] =>
  s.roles.map((role, i) => ({
    role,
    path: `${s.id}/${role}-mg1x0${i}.mp4`,
    durationMs: 4200 + i * 300,
    aspect: "16:9",
  }));

const SAMPLE_VIDEOS = Object.fromEntries(STEPS.map((s) => [s.id, videosOf(s)]));

function detailFor(s: SampleStep): AdminStepDetail {
  const videos = videosOf(s);
  const roles = new Set(videos.map((v) => v.role));
  const issues: AdminStepDetail["issues"] =
    roles.has("both") || (roles.has("leader") && roles.has("follower"))
      ? []
      : s.category === "libre"
        ? ["missing_video_both"]
        : [
            ...(roles.has("leader") ? [] : (["missing_video_leader"] as const)),
            ...(roles.has("follower")
              ? []
              : (["missing_video_follower"] as const)),
          ];
  return {
    id: s.id,
    styleId: SALSA.id,
    published: s.published,
    voiceClipPath: s.hasVoiceClip ? `steps/${s.id}-mg1x0a.m4a` : null,
    videos,
    issues,
    lessonCount: s.lessonCount,
    draft: {
      name: s.name,
      slug: s.slug,
      category: s.category,
      difficulty: s.difficulty,
      phrases: s.category === "figura" ? "2" : "1",
      startPositionId: s.start,
      endPositionId: s.end,
      canStart: s.category === "base" || s.category === "entrada",
      canEnd: true,
      repeatable: s.category === "base",
      description: s.description,
      beatNotes: beatNotesToDraft(s.notes ?? [], SALSA.beatsPerPhrase),
      variationOf: s.slug === "enchufla-doble" ? id(7) : null,
      prerequisites: s.slug === "setenta" ? [id(7)] : [],
      sortOrder: String(s.sortOrder),
    },
  };
}

const DEFAULT_STEP: Partial<Record<SampleState, StepSelection>> = {
  edit: { kind: "step", id: id(7) },
  new: { kind: "new" },
  blocked: { kind: "step", id: id(13) },
  "save-error": { kind: "step", id: id(7) },
  uploading: { kind: "step", id: id(13) },
};

export default async function AdminStepsSamplePage(
  props: PageProps<"/layouts/admin-steps">,
) {
  const params = await props.searchParams;
  const raw = firstParam(params.state);
  const state: SampleState =
    raw && raw in STATES ? (raw as SampleState) : "list";
  const fromUrl = parseSelection(params);
  const selection =
    fromUrl.kind !== "none"
      ? fromUrl
      : (DEFAULT_STEP[state] ?? { kind: "none" });
  const style = firstParam(params.style) === MERENGUE.slug ? MERENGUE : SALSA;
  const steps = style === SALSA ? ROWS : [];
  const open =
    selection.kind === "step"
      ? STEPS.find((s) => s.id === selection.id)
      : undefined;

  return (
    <AdminShell currentPath="/admin/steps">
      <div className="flex flex-col gap-12">
        <StepsAdminSample
          // Cada estado y cada paso abierto montan la vista de nuevo (la muestra no tiene router).
          key={`${state}-${style.slug}`}
          styles={[SALSA, MERENGUE]}
          currentStyle={style}
          positions={style === SALSA ? POSITIONS : []}
          steps={steps}
          selection={selection}
          detail={open && style === SALSA ? detailFor(open) : null}
          initialFilters={parseAdminStepFilters(params)}
          loadError={state === "load-error"}
          basePath="/layouts/admin-steps"
          extraParams={{ state }}
          sampleVideos={SAMPLE_VIDEOS}
          failSave={state === "save-error"}
          initialEditorStatus={
            state === "save-error"
              ? { tone: "error", text: writeErrorMessage({ message: "" }) }
              : undefined
          }
          initialUploading={state === "uploading" ? "follower" : undefined}
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
            responden con datos falsos. La vista previa de un video no carga (no
            hay Storage).
          </p>
          <ul className="flex flex-wrap gap-2">
            {(Object.keys(STATES) as SampleState[]).map((key) => (
              <li key={key}>
                <Link
                  href={`/layouts/admin-steps?state=${key}`}
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
