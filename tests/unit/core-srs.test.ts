import { describe, expect, test } from "bun:test";
import { Rating } from "ts-fsrs";
import {
  isDue,
  markKnown,
  markLearning,
  reviewCard,
  toFsrsRating,
} from "@/supabase/functions/_shared/core/srs.ts";

const NOW = new Date("2026-10-01T12:00:00.000Z");

describe("srs: envoltura de ts-fsrs", () => {
  test("1–4 → Again/Hard/Good/Easy; lo demás lanza", () => {
    expect([1, 2, 3, 4].map(toFsrsRating)).toEqual([
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
    ]);
    for (const bad of [0, 5, 2.5, Number.NaN]) {
      expect(() => toFsrsRating(bad)).toThrow(RangeError);
      expect(() => reviewCard(markLearning(NOW), bad, NOW)).toThrow(RangeError);
    }
  });

  test("no muta la tarjeta de entrada", () => {
    const card = markLearning(NOW);
    const copy = structuredClone(card);
    reviewCard(card, 3, NOW);
    expect(card).toEqual(copy);
  });

  test("tarjetas dentro de los límites de srs_cards (check de la migración)", () => {
    let card = markKnown(NOW).card;
    let now = NOW;
    for (const r of [1, 2, 3, 4, 1, 1, 4, 3]) {
      now = new Date(now.getTime() + 86_400_000);
      card = reviewCard(card, r, now).card;
      expect(card.difficulty).toBeGreaterThanOrEqual(0);
      expect(card.difficulty).toBeLessThanOrEqual(10);
      expect(card.stability).toBeGreaterThanOrEqual(0);
      // Sin pasos cortos (D044): nunca learning/relearning.
      expect(card.state).toBe("review");
      expect(new Date(card.due_at).getTime()).toBeGreaterThan(now.getTime());
    }
  });

  test("isDue compara con ≤", () => {
    const card = markLearning(NOW);
    expect(isDue(card, NOW)).toBe(true);
    expect(isDue(card, new Date(NOW.getTime() - 1))).toBe(false);
  });
});
