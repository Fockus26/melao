// Módulo común de dificultad (D137): nombres de los niveles y su reexport desde Canciones.
import { describe, expect, test } from "bun:test";
import {
  DIFFICULTY_NAMES,
  DIFFICULTY_OPTIONS,
  difficultyName,
  isDifficultyLevel,
} from "@/lib/difficulty";
import * as songs from "@/lib/songs/songs";

describe("lib/difficulty", () => {
  test("cinco niveles en orden, con nombre", () => {
    expect(DIFFICULTY_OPTIONS).toEqual([1, 2, 3, 4, 5]);
    expect(DIFFICULTY_OPTIONS.map((l) => DIFFICULTY_NAMES[l])).toEqual([
      "Muy fácil",
      "Fácil",
      "Media",
      "Difícil",
      "Muy difícil",
    ]);
  });

  test("fuera de 1–5 o no entero: sin nombre", () => {
    for (const n of [0, 6, 2.5, Number.NaN]) {
      expect(isDifficultyLevel(n)).toBe(false);
      expect(difficultyName(n)).toBeNull();
    }
    expect(difficultyName(3)).toBe("Media");
  });

  test("Canciones reexporta lo mismo", () => {
    expect(songs.DIFFICULTY_NAMES).toBe(DIFFICULTY_NAMES);
    expect(songs.DIFFICULTY_OPTIONS).toBe(DIFFICULTY_OPTIONS);
    expect(songs.difficultyName).toBe(difficultyName);
  });
});
