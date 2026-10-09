import type {
  AdminCourseData,
  CourseLesson,
  CourseStep,
  CourseUnit,
} from "@/lib/admin/course";
import type { AdminStyle } from "@/lib/admin/steps";

/**
 * Datos de la muestra de Admin · Camino: salsa casino con 3 unidades y 8 lecciones (una válida,
 * una con aviso de secuencia, una sin canción ni pasos, un paso sin publicar) y merengue sin
 * curso. Copy de ejemplo (CONTENT_CHECKLIST fila 91).
 */

export const SALSA: AdminStyle = {
  id: "a0000000-0000-4000-8000-000000000001",
  slug: "salsa-casino",
  name: "Salsa casino",
  hasRoles: true,
  beatsPerPhrase: 8,
  published: true,
};
export const MERENGUE: AdminStyle = {
  id: "a0000000-0000-4000-8000-000000000002",
  slug: "merengue",
  name: "Merengue",
  hasRoles: true,
  beatsPerPhrase: 8,
  published: false,
};

const G = "a1000000-0000-4000-8000-000000000001"; // Guapea
const C = "a1000000-0000-4000-8000-000000000002"; // Cerrada
const A = "a1000000-0000-4000-8000-000000000003"; // Abierta

const sid = (n: number) =>
  `b1000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const lid = (n: number) =>
  `d2000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const uid = (n: number) =>
  `d1000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const song = (n: number) =>
  `c0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const step = (
  n: number,
  slug: string,
  name: string,
  category: CourseStep["category"],
  start: string,
  end: string,
  over: Partial<CourseStep> = {},
): CourseStep => ({
  id: sid(n),
  slug,
  name,
  category,
  published: true,
  phrases: 1,
  startPosition: start,
  endPosition: end,
  canStart: false,
  canEnd: false,
  repeatable: false,
  ...over,
});

const STEPS: CourseStep[] = [
  step(1, "guapea", "Guapea", "base", G, G, {
    canStart: true,
    canEnd: true,
    repeatable: true,
  }),
  step(2, "basico-cerrada", "Básico en cerrada", "base", C, C, {
    canEnd: true,
    repeatable: true,
  }),
  step(3, "dile-que-si", "Dile que sí", "entrada", G, C, { canStart: true }),
  step(4, "dile-que-no", "Dile que no", "salida", C, G, { canEnd: true }),
  step(5, "vuelta-derecha", "Vuelta a la derecha", "vuelta", G, G, {
    canStart: true,
    canEnd: true,
  }),
  step(7, "enchufla", "Enchufla", "salida", C, G, { canEnd: true }),
  step(9, "exhibela", "Exhíbela", "figura", G, G, { canEnd: true }),
  step(10, "dame", "Dame", "figura", C, C, { canEnd: true }),
  step(11, "vacilala", "Vacílala", "figura", G, G, { canEnd: true }),
  step(13, "sombrero", "Sombrero", "figura", C, C, {
    published: false,
    canEnd: true,
  }),
  step(14, "setenta", "Setenta", "figura", C, G, { phrases: 3, canEnd: true }),
  step(18, "abanico", "Abanico", "figura", C, A),
  step(19, "paseala", "Pasea la dama", "figura", A, A),
];

const lesson = (
  n: number,
  title: string,
  stepSlugs: string[],
  over: Partial<CourseLesson> = {},
): CourseLesson => ({
  id: lid(n),
  title,
  intro: "",
  practiceSongId: song(1),
  practicePhrases: 4,
  finalSongId: song(2),
  progressCount: 0,
  stepIds: stepSlugs.map(
    (slug) => STEPS.find((s) => s.slug === slug)?.id ?? slug,
  ),
  songIssues: [],
  ...over,
});

export const LESSONS = {
  valid: lid(112),
  warning: lid(123),
  noSong: lid(132),
};

const UNITS: CourseUnit[] = [
  {
    id: uid(11),
    title: "Fundamentos",
    lessons: [
      lesson(111, "La guapea", ["guapea"], {
        intro:
          "El paso con el que empieza todo: atrás y adelante, frente a frente.",
        progressCount: 18,
      }),
      lesson(
        112,
        "Entrar y salir de cerrada",
        ["dile-que-si", "basico-cerrada", "dile-que-no"],
        {
          intro:
            "Del abrazo a la guapea y de vuelta: Dile que sí y Dile que no.",
          progressCount: 9,
        },
      ),
      lesson(113, "Primeras vueltas", ["vuelta-derecha", "enchufla"], {
        progressCount: 3,
      }),
    ],
  },
  {
    id: uid(12),
    title: "Primeras figuras",
    lessons: [
      lesson(121, "Exhíbela y Dame", ["exhibela", "dame"], {
        practiceSongId: song(2),
        practicePhrases: 6,
      }),
      lesson(122, "Vacílala y Sombrero", ["vacilala", "sombrero"], {
        finalSongId: song(3),
        songIssues: ["song_unavailable"],
      }),
      lesson(123, "El abanico", ["abanico", "paseala"], {
        intro: "Abrir a la pareja hacia un lado y pasearla en abierta.",
      }),
    ],
  },
  {
    id: uid(13),
    title: "Rueda de a dos",
    lessons: [
      lesson(131, "El setenta", ["setenta"], { practicePhrases: 6 }),
      lesson(132, "Repaso de la unidad", [], {
        practiceSongId: null,
        practicePhrases: null,
        finalSongId: null,
        songIssues: ["missing_song"],
      }),
    ],
  },
];

export const SALSA_COURSE: AdminCourseData = {
  style: {
    id: SALSA.id,
    slug: SALSA.slug,
    name: SALSA.name,
    published: true,
    startPositionId: G,
    config: {
      beatsPerPhrase: 8,
      spokenBeats: [1, 2, 3, 5, 6, 7],
      callBeat: 5,
      callSpanBeats: 2,
      leadInPhrases: 1,
    },
  },
  positions: [
    { id: A, name: "Abierta" },
    { id: C, name: "Cerrada" },
    { id: G, name: "Guapea" },
  ],
  steps: STEPS,
  songs: [
    {
      id: song(1),
      title: "Pista de prueba 1 · casino lento",
      artist: "Melao (placeholder)",
      published: true,
      visible: true,
      inStyle: true,
      durationMs: 210000,
      danceEndMs: 195000,
      beatGrid: [
        { beat: 0, tMs: 1500 },
        { beat: 512, tMs: 193500 },
      ],
      bpm: 160,
    },
    {
      id: song(2),
      title: "Pista de prueba 2 · casino medio",
      artist: "Melao (placeholder)",
      published: true,
      visible: true,
      inStyle: true,
      durationMs: 200000,
      danceEndMs: 185000,
      beatGrid: [
        { beat: 0, tMs: 2000 },
        { beat: 540, tMs: 182000 },
      ],
      bpm: 180,
    },
    {
      id: song(3),
      title: "Pista de prueba 3 · casino rápido",
      artist: "Melao (placeholder)",
      published: false,
      visible: false,
      inStyle: true,
      durationMs: 195000,
      danceEndMs: null,
      beatGrid: null,
      bpm: 200,
    },
  ],
  course: {
    id: "d0000000-0000-4000-8000-000000000001",
    title: "Salsa casino desde cero",
    description:
      "De la guapea a tus primeras figuras en rueda de a dos, frase a frase.",
    published: true,
    issues: ["lesson_without_steps", "lesson_without_song"],
  },
  units: UNITS,
};

export const MERENGUE_COURSE: AdminCourseData = {
  ...SALSA_COURSE,
  style: {
    ...SALSA_COURSE.style,
    id: MERENGUE.id,
    slug: MERENGUE.slug,
    name: MERENGUE.name,
    published: false,
  },
  positions: [],
  steps: [],
  songs: [],
  course: null,
  units: [],
};
