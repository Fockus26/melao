import { DIFFICULTY_LEVELS } from "@/components/indicators/difficulty";

/**
 * Niveles de dificultad (1–5) de pasos y canciones, con sus nombres. Módulo común: lo usan
 * Canciones, el configurador de Practicar y las muestras; `lib/songs/songs.ts` lo reexporta.
 * El nivel de una canción lo calcula `private.song_difficulty` (D003); aquí solo se nombra.
 */

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

// Copy provisional (CONTENT_CHECKLIST fila 65): nombres de los niveles, los mismos que la
// muestra del Slider de primitivas.
export const DIFFICULTY_NAMES: Record<DifficultyLevel, string> = {
  1: "Muy fácil",
  2: "Fácil",
  3: "Media",
  4: "Difícil",
  5: "Muy difícil",
};

/** Los niveles en orden: 1…5. */
export const DIFFICULTY_OPTIONS = Array.from(
  { length: DIFFICULTY_LEVELS },
  (_, i) => (i + 1) as DifficultyLevel,
);

export const isDifficultyLevel = (n: number): n is DifficultyLevel =>
  Number.isInteger(n) && n >= 1 && n <= DIFFICULTY_LEVELS;

/** Nombre del nivel; `null` fuera de 1–5. */
export const difficultyName = (level: number) =>
  isDifficultyLevel(level) ? DIFFICULTY_NAMES[level] : null;
