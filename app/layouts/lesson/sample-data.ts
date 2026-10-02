import type { LessonData } from "@/lib/lesson/lesson";
import { constantGrid } from "@/supabase/functions/_shared/core/grid";
import { SALSA_CASINO } from "@/supabase/functions/_shared/core/style";

/** Datos de la muestra de la lección (lección 3 del curso del seed). Copy de ejemplo (fila 56). */

export type SampleStage =
  | "intro"
  | "video"
  | "practice"
  | "final"
  | "rating"
  | "summary"
  | "unavailable";

export const SAMPLE_NOW = "2026-09-30T15:00:00.000Z";
export const SAMPLE_TZ = "America/Mexico_City";
export const SONG_ID = "c0000000-0000-4000-8000-000000000001";
export const BPM = 160;
export const FIRST_ONE_MS = 1500;
export const DAY_MS = 86_400_000;

export const SAMPLE_LESSON: LessonData = {
  id: "d2000000-0000-4000-8000-000000000113",
  title: "Primeras vueltas",
  intro: "La vuelta a la derecha y la enchufla, el cambio de lugar.",
  number: 3,
  styleId: "a0000000-0000-4000-8000-000000000001",
  styleName: "Salsa casino",
  hasRoles: true,
  style: SALSA_CASINO,
  role: "leader",
  practiceSongId: SONG_ID,
  practicePhrases: 4,
  finalSongId: SONG_ID,
  songs: [
    {
      id: SONG_ID,
      bpm: BPM,
      beatGrid: constantGrid(BPM, FIRST_ONE_MS),
      danceEndMs: 195000,
      durationMs: 210000,
    },
  ],
  steps: [
    {
      id: "vuelta-derecha",
      slug: "vuelta-derecha",
      name: "Vuelta a la derecha",
      free: false,
      beatNotes: [
        { beat: 1, note: "Atrás, preparando la mano" },
        { beat: 2, note: "Marca la vuelta con la mano izquierda arriba" },
        { beat: 3, note: "La pareja gira a su derecha" },
        { beat: 5, note: "Termina el giro frente a frente" },
        { beat: 7, note: "Vuelve a la guapea" },
      ],
      videos: {},
      dueAt: null,
    },
    {
      id: "enchufla",
      slug: "enchufla",
      name: "Enchufla",
      free: false,
      beatNotes: [
        { beat: 1, note: "Atrás en guapea" },
        { beat: 3, note: "Levanta la mano y cambian de lugar" },
        { beat: 5, note: "Giro de la pareja por debajo del brazo" },
        { beat: 7, note: "Cierran de frente, en el lugar del otro" },
      ],
      videos: {},
      // Ya repasado: no vence hoy (muestra "No vence hoy" y "Saltar este paso").
      dueAt: "2026-10-04T15:00:00.000Z",
    },
  ],
  stepNames: {
    guapea: { slug: "guapea", name: "Guapea" },
    "vuelta-derecha": { slug: "vuelta-derecha", name: "Vuelta a la derecha" },
    enchufla: { slug: "enchufla", name: "Enchufla" },
  },
  latencyOffsetMs: null,
  next: {
    id: "d2000000-0000-4000-8000-000000000121",
    number: 4,
    title: "Exhíbela y Dame",
  },
};
